import React, { useState, useRef, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const VoicePlayer = ({ audioUrl, fileName, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error("Audio playback error:", err));
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    let nextRate = 1.0;
    if (playbackRate === 1.0) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2.0;
    else nextRate = 1.0;

    setPlaybackRate(nextRate);
    if (audio) {
      audio.playbackRate = nextRate;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Box
      className="voice-player-container"
      p={2.5}
      borderRadius="14px"
      w="260px"
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Top Row: Play/Pause Button, Animated Soundwave Bars, Speed Toggle */}
      <Box display="flex" alignItems="center" gap={2.5}>
        <button
          onClick={togglePlayPause}
          className="voice-play-btn"
          title={isPlaying ? "Pause Voice Note" : "Play Voice Note"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Dynamic Waveform Visualizer Bars */}
        <Box display="flex" alignItems="center" gap="3px" flex="1" h="28px" justifyContent="center">
          {[40, 70, 30, 90, 50, 80, 45, 100, 60, 35, 75, 55, 85, 40, 65].map((height, idx) => {
            const isPlayed = (idx / 15) * 100 <= progressPercent;
            return (
              <span
                key={idx}
                className={`voice-wave-bar ${isPlaying ? "animating" : ""} ${isPlayed ? "played" : "unplayed"}`}
                style={{
                  height: isPlaying ? `${Math.max(20, (height * (idx % 3 + 1)) % 100)}%` : `${height}%`,
                  animationDelay: `${(idx % 5) * 0.1}s`,
                }}
              />
            );
          })}
        </Box>

        {/* Speed Toggle Button */}
        <button
          onClick={cyclePlaybackRate}
          className="voice-speed-btn"
          title="Change playback speed"
        >
          {playbackRate}x
        </button>
      </Box>

      {/* Middle Row: Progress Slider */}
      <Box display="flex" alignItems="center" gap={2}>
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercent || 0}
          onChange={handleSeek}
          className="voice-progress-slider"
          style={{
            background: `linear-gradient(to right, var(--vp-wave-active) ${progressPercent}%, var(--vp-slider-track) ${progressPercent}%)`,
          }}
        />
      </Box>

      {/* Bottom Row: Time Display */}
      <Box display="flex" alignItems="center" justifyContent="space-between" px={0.5}>
        <Text fontSize="11px" fontWeight="600" color="var(--vp-text)">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </Box>
    </Box>
  );
};

export default VoicePlayer;
