"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem, StreamSource, SubtitleTrack } from "@/lib/types";
import { saveLocalProgress } from "@/lib/local-library";

function safeEmbedUrl(value: string, autoplay = false, muted = true): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) id = url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || "";
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? `&autoplay=1&mute=${muted ? 1 : 0}` : ""}`;
    if (host === "player.vimeo.com" && /^\/video\/\d+/.test(url.pathname)) return url.toString();
    if (host === "drive.google.com" && /^\/file\/d\/[A-Za-z0-9_-]+\/preview$/.test(url.pathname)) return url.toString();
    return null;
  } catch {
    return null;
  }
}

type Props = { item: CatalogItem; sources: StreamSource[]; subtitles?: SubtitleTrack[]; compact?: boolean; autoplay?: boolean; muted?: boolean; deferOffscreen?: boolean; onViewStart?: () => void };

export function VideoPlayer({ item, sources, subtitles = [], compact = false, autoplay = false, muted = false, deferOffscreen = false, onViewStart }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const dashRef = useRef<{ reset: () => void } | null>(null);
  const lastSavedAt = useRef(0);
  const wasVisible = useRef(false);
  const [sourceId, setSourceId] = useState(sources[0]?.id || "");
  const [loadError, setLoadError] = useState<{ sourceId: string; message: string } | null>(null);
  const [inView, setInView] = useState(!deferOffscreen);
  const source = useMemo(() => sources.find(candidate => candidate.id === sourceId) || sources[0], [sources, sourceId]);
  const embedUrl = source?.stream_url && (source.source_type === "youtube" || source.source_type === "embed") ? safeEmbedUrl(source.stream_url, autoplay, muted) : null;
  const isEmbed = Boolean(embedUrl && (!deferOffscreen || inView));
  const sourceError = !source ? "This title has no active authorized video source." : (source.source_type === "embed" || source.source_type === "youtube") && !embedUrl ? "This external source is not on the supported embed list." : source.source_type !== "embed" && source.source_type !== "youtube" && !/^https:\/\//i.test(source.stream_url || "") ? "This video source is temporarily unavailable." : "";
  const error = sourceError || (loadError?.sourceId === source?.id ? loadError.message : "");

  useEffect(() => {
    if (!autoplay && !deferOffscreen) return;
    const target = frameRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      const visible = Boolean(entries[0]?.isIntersecting && (entries[0].intersectionRatio > 0.72 || !autoplay));
      setInView(visible);
      const video = videoRef.current;
      if (visible) {
        if (!wasVisible.current) onViewStart?.();
        wasVisible.current = true;
        if (autoplay && video) void video.play().catch(() => undefined);
      } else {
        wasVisible.current = false;
        video?.pause();
      }
    }, { threshold: [0, 0.72, 1] });
    observer.observe(target);
    return () => observer.disconnect();
  }, [autoplay, deferOffscreen, onViewStart]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    dashRef.current?.reset();
    dashRef.current = null;
    video.removeAttribute("src");
    video.load();
    if (deferOffscreen && !inView) return;
    if (!source || source.source_type === "embed" || source.source_type === "youtube") {
      return;
    }
    const streamUrl = source.stream_url;
    if (!streamUrl || !/^https:\/\//i.test(streamUrl)) return;
    let disposed = false;
    const playWhenReady = () => { if (autoplay && inView) void video.play().catch(() => undefined); };
    video.addEventListener("canplay", playWhenReady);
    const attach = async () => {
      try {
        if (source.source_type === "hls") {
          if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = streamUrl;
          else {
            const hlsModule = await import("hls.js");
            const Hls = hlsModule.default;
            if (!Hls.isSupported()) { setLoadError({ sourceId: source.id, message: "This browser cannot play this stream format." }); return; }
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 20 });
            hlsRef.current = hls;
            hls.on(Hls.Events.ERROR, (_event, detail) => { if (detail.fatal && !disposed) setLoadError({ sourceId: source.id, message: "This stream is temporarily unavailable." }); });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
          }
        } else if (source.source_type === "dash") {
          const dashjs = await import("dashjs");
          if (disposed) return;
          const player = dashjs.MediaPlayer().create();
          dashRef.current = player;
          player.initialize(video, streamUrl, autoplay && inView);
          player.on("error", () => { if (!disposed) setLoadError({ sourceId: source.id, message: "This stream is temporarily unavailable." }); });
        } else video.src = streamUrl;
      } catch {
        if (!disposed) setLoadError({ sourceId: source.id, message: "This video source could not be started." });
      }
    };
    void attach();
    return () => {
      disposed = true;
      video.removeEventListener("canplay", playWhenReady);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      dashRef.current?.reset();
      dashRef.current = null;
    };
  }, [source, embedUrl, autoplay, deferOffscreen, inView]);

  const saveProgress = useCallback((video: HTMLVideoElement) => {
    if (compact || Date.now() - lastSavedAt.current < 12000) return;
    lastSavedAt.current = Date.now();
    saveLocalProgress(item, video.currentTime, video.duration || item.duration_seconds || 0);
  }, [compact, item]);
  const poster = item.thumbnail_url || item.poster_url || item.backdrop_url || undefined;

  return <div ref={frameRef} className={`player-frame${compact ? " player-compact" : ""}`}>
    {isEmbed && embedUrl ? <iframe src={embedUrl} title={`Video player for ${item.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <video ref={videoRef} controls={!compact} playsInline preload={deferOffscreen && !inView ? "none" : "metadata"} muted={muted} onTimeUpdate={event => saveProgress(event.currentTarget)} onEnded={event => { lastSavedAt.current = 0; saveProgress(event.currentTarget); }} onError={() => { if (source?.id) setLoadError({ sourceId: source.id, message: "Playback is temporarily unavailable for this source." }); }}>
      {subtitles.map(track => track.subtitle_url ? <track key={track.id} kind="subtitles" src={track.subtitle_url} srcLang={track.language} label={track.label} default={track.is_default} /> : null)}
    </video>}
    {deferOffscreen && !inView && <div className="player-offscreen" style={poster ? { backgroundImage: `linear-gradient(0deg,rgba(5,5,8,.55),rgba(5,5,8,.1)),url("${poster.replaceAll('"', "")}")` } : undefined}><span>Scroll to play</span></div>}
    {error && <div className="player-error" role="status"><div><strong>Unable to play this source</strong><p>{error}</p></div></div>}
    {!compact && sources.length > 1 && <div className="player-options"><label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--muted)" }}>Source / quality <select className="select-field" value={source?.id || sourceId} onChange={event => setSourceId(event.target.value)}>{sources.map(value => <option key={value.id} value={value.id}>{value.quality}{value.language ? ` · ${value.language}` : ""}</option>)}</select></label><label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--muted)" }}>Speed <select className="select-field" defaultValue="1" onChange={event => { if (videoRef.current) videoRef.current.playbackRate = Number(event.target.value); }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>}
  </div>;
}
