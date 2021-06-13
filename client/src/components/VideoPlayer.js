import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { makeStyles } from '@material-ui/core/styles';
import { useWindowSize } from '../hooks/useWindowSize';
import { arrayEquals } from '../services/Util'
import { KeyBindings } from '@project/common';
import Alert from './Alert';
import Clock from '../services/Clock';
import Controls from './Controls';
import PlayerChannel from '../services/PlayerChannel';

const useStyles = makeStyles({
    root: {
        position: 'relative',
        backgroundColor: 'black',
        height: '100vh',
        overflow: 'hidden',
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    },
    video: {
        margin: "auto"
    },
    cursorHidden: {
        cursor: "none"
    }
});

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    }
}

function makeSubtitleStyles(
    subtitleSize,
    subtitleColor,
    subtitleOutlineThickness,
    subtitleOutlineColor,
    subtitleBackgroundColor,
    subtitleBackgroundOpacity
) {
    const styles = {
        position: 'absolute',
        paddingLeft: 20,
        paddingRight: 20,
        bottom: 100,
        textAlign: 'center',
        color: subtitleColor,
        fontSize: Number(subtitleSize),
    };

    if (subtitleOutlineThickness > 0) {
        const thickness = subtitleOutlineThickness;
        const color = subtitleOutlineColor;
        styles['textShadow'] = `0 0 ${thickness}px ${color}, 0 0 ${thickness}px ${color}, 0 0 ${thickness}px ${color}, 0 0 ${thickness}px ${color}`;
    }

    if (subtitleBackgroundOpacity > 0) {
        const opacity = subtitleBackgroundOpacity;
        const color = subtitleBackgroundColor;
        const {r, g, b} = hexToRgb(color);
        styles['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${opacity})`
    }

    return styles;
}

function notifyReady(element, playerChannel, setAudioTracks, setSelectedAudioTrack) {
    if (window.outerWidth && element.videoWidth > 0 && element.videoHeight > 0) {
        const availWidth = window.screen.availWidth - (window.outerWidth - window.innerWidth);
        const availHeight = window.screen.availHeight - (window.outerHeight - window.innerHeight);
        const resizeRatio = Math.min(1, Math.min(availWidth / element.videoWidth, availHeight / element.videoHeight));

        window.resizeTo(
            resizeRatio * element.videoWidth + (window.outerWidth - window.innerWidth),
            resizeRatio * element.videoHeight + (window.outerHeight - window.innerHeight)
        );
    }

    let tracks;
    let selectedTrack;

    if (element.audioTracks) {
        tracks = [];

        for (let t of element.audioTracks) {
            tracks.push({
                id: t.id,
                label: t.label,
                language: t.language
            });

            if (t.enabled) {
                selectedTrack = t.id;
            }
        }
    } else {
        tracks = null;
        selectedTrack = null;
    }

    setAudioTracks(tracks);
    setSelectedAudioTrack(selectedTrack);
    playerChannel.ready(element.duration, element.paused, tracks, selectedTrack);
}

function errorMessage(element) {
    let error;
    switch (element.error.code) {
        case 1:
            error = "Aborted";
            break;
        case 2:
            error = "Network error";
            break;
        case 3:
            error = "Decoding error";
            break;
        case 4:
            error = "Source not supported";
            break;
        default:
            error = "Unknown error";
            break;
    }

    return error + ": " + (element.error.message || "<details missing>");
}

function useFullscreen() {
    const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

    useEffect(() => {
        const listener = () => setFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', listener);

        return () => document.removeEventListener('fullscreenchange', listener);
    }, []);

    return fullscreen;
}

export default function VideoPlayer(props) {
    const classes = useStyles();
    const {settingsProvider, videoFile, channel, popOut, onError} = props;
    const poppingInRef = useRef();
    const videoRef = useRef();
    const [windowWidth, windowHeight] = useWindowSize(true);
    if (videoRef.current) {
        videoRef.current.width = windowWidth;
        videoRef.current.height = windowHeight;
    }
    const playerChannel = useMemo(() => new PlayerChannel(channel), [channel]);
    const [playing, setPlaying] = useState(false);
    const fullscreen = useFullscreen();
    const fullscreenRef = useRef();
    fullscreenRef.current = fullscreen;
    const playingRef = useRef();
    playingRef.current = playing;
    const [length, setLength] = useState(0);
    const [offset, setOffset] = useState(0);
    const [audioTracks, setAudioTracks] = useState();
    const [selectedAudioTrack, setSelectedAudioTrack] = useState();
    const [subtitles, setSubtitles] = useState([]);
    const [showSubtitles, setShowSubtitles] = useState([]);
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
    const [condensedModeEnabled, setCondensedModeEnabled] = useState(false);
    const [subtitlePlayerHidden, setSubtitlePlayerHidden] = useState(false);
    const showSubtitlesRef = useRef([]);
    showSubtitlesRef.current = showSubtitles;
    const clock = useMemo(() => new Clock(), []);
    const mousePositionRef = useRef({x:0, y:0});
    const containerRef = useRef();
    const [alert, setAlert] = useState();
    const [alertOpen, setAlertOpen] = useState(false);
    const [controlsShowing, setControlsShowing] = useState(true);

    const videoRefCallback = useCallback(element => {
        if (element) {
            videoRef.current = element;

            if (element.readyState === 4) {
                notifyReady(element, playerChannel, setAudioTracks, setSelectedAudioTrack);
            } else {
                element.onloadeddata = (event) => {
                    notifyReady(element, playerChannel, setAudioTracks, setSelectedAudioTrack);
                };
            }

            element.oncanplay = (event) => {
                playerChannel.readyState(4);

                if (playingRef.current) {
                    clock.start();
                }
            };

            element.onerror = (event) => onError(errorMessage(element));
        }
    }, [clock, playerChannel, onError]);

    function selectAudioTrack(id) {
        for (let t of videoRef.current.audioTracks) {
            if (t.id === id) {
                t.enabled = true;
            } else {
                t.enabled = false;
            }
        }
    }

    useEffect(() => {
        playerChannel.onReady((duration) => setLength(duration));

        playerChannel.onPlay(() => {
            videoRef.current.play();
            clock.start();
            setPlaying(true);
        });

        playerChannel.onPause(() => {
            videoRef.current.pause();
            clock.stop();
            setPlaying(false);
        });

        playerChannel.onCurrentTime((currentTime) => {
            if (videoRef.current) {
                videoRef.current.currentTime = currentTime;
            }

            if (videoRef.current?.readyState === 4) {
                playerChannel.readyState(4);
            }

            clock.stop();
            clock.setTime(currentTime * 1000);
        });

        playerChannel.onAudioTrackSelected((id) => {
            selectAudioTrack(id);
            playerChannel.audioTrackSelected(id);
        });

        playerChannel.onClose(() => {
            playerChannel.close();
            window.close();
        });

        playerChannel.onSubtitles((subtitles) => {
            setSubtitles(subtitles);
            if (subtitles && subtitles.length > 0) {
                const s = subtitles[0];
                const offset = s.start - s.originalStart;
                setOffset(offset);
            }
        });

        playerChannel.onCondensedModeToggle((enabled) => setCondensedModeEnabled(enabled));
        playerChannel.onHideSubtitlePlayerToggle((hidden) => setSubtitlePlayerHidden(hidden));
        playerChannel.onCardUpdated((card) => {
            if (fullscreenRef.current) {
                setAlert("Updated card: " + card);
                setAlertOpen(true);
            }
        });

        window.onbeforeunload = (e) => {
            if (!poppingInRef.current) {
                playerChannel.close();
            }
        };

        return () => playerChannel.close();
    }, [clock, playerChannel]);

    const handlePlay = useCallback(() => {
        if (videoRef.current) {
            playerChannel.play();
        }
    }, [playerChannel]);

    const handlePause = useCallback(() => playerChannel.pause(), [playerChannel]);

    const handleSeek = useCallback((progress) => {
        if (playingRef.current) {
            clock.stop();
        }

        const time = progress * length;
        playerChannel.currentTime = time / 1000;
    }, [length, clock, playerChannel]);

    function handleMouseMove(e) {
        mousePositionRef.current.x = e.screenX;
        mousePositionRef.current.y = e.screenY;
    };

    const handleAudioTrackSelected = useCallback((id) => {
        if (playingRef.current) {
            clock.stop();
            playerChannel.pause();
        }

        selectAudioTrack(id);
        setSelectedAudioTrack(id);
        playerChannel.currentTime = 0;
        playerChannel.audioTrackSelected(id);
    }, [playerChannel, clock]);

    useEffect(() => {
        if (!subtitles || subtitles.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            const now = clock.time(length);
            const showSubtitles = [];

            for (let i = 0; i < subtitles.length; ++i) {
                const s = subtitles[i];

                if (now >= s.start && now < s.end) {
                    showSubtitles.push({...s, index: i});
                }

                if (now < s.start) {
                    break;
                }
            }

            if (!arrayEquals(showSubtitles, showSubtitlesRef.current, (s1, s2) => s1.index === s2.index)) {
                setShowSubtitles(showSubtitles);
            }
        }, 10)

        return () => clearTimeout(interval);
    }, [subtitles, clock, length]);

    const handleOffsetChange = useCallback((offset) => {
        setOffset(offset);
        setSubtitles(subtitles => subtitles.map(s => ({
            text: s.text,
            start: s.originalStart + offset,
            originalStart: s.originalStart,
            end: s.originalEnd + offset,
            originalEnd: s.originalEnd,
        })));
        playerChannel.offset(offset);
    }, [playerChannel]);

    useEffect(() => {
        const unbind = KeyBindings.bindSeekToSubtitle(
            (event, subtitle) => {
                event.stopPropagation();
                event.preventDefault();
                playerChannel.currentTime = subtitle.start / 1000;
            },
            () => !videoRef.current,
            () => clock.time(length),
            () => subtitles
        );

        return () => unbind();
    }, [playerChannel, subtitles, length, clock]);

    useEffect(() => {
        const unbind = KeyBindings.bindCopy(
            (event, subtitle) => {
                event.stopPropagation();
                event.preventDefault();
                playerChannel.copy(subtitle, false);

                if (fullscreen) {
                    setAlert("Copied " + subtitle.text);
                    setAlertOpen(true);
                }
            },
            () => false,
            () => {
                if (!showSubtitlesRef.current || showSubtitlesRef.current.length === 0) {
                    return null;
                }

                return showSubtitlesRef.current[0];
            }
        );

        return () => unbind();
    }, [playerChannel, fullscreen]);

    useEffect(() => {
        const unbind = KeyBindings.bindCopyAndUpdateLastCard(
            (event, subtitle) => {
                event.stopPropagation();
                event.preventDefault();
                playerChannel.pause();
                playerChannel.copy(subtitle, true);
            },
            () => false,
            () => {
                if (!showSubtitlesRef.current || showSubtitlesRef.current.length === 0) {
                    return null;
                }

                return showSubtitlesRef.current[0];
            }
        );

        return () => unbind();
    }, [playerChannel, fullscreen]);

    useEffect(() => {
        const unbind = KeyBindings.bindAdjustOffset(
            (event, offset) => {
                event.preventDefault();
                event.stopPropagation();
                handleOffsetChange(offset);
            },
            () => false,
            () => subtitles
        );

        return () => unbind();
    }, [handleOffsetChange, subtitles]);

    useEffect(() => {
        const unbind = KeyBindings.bindToggleSubtitles(
            (event) => setSubtitlesEnabled(enabled => !enabled),
            () => false
        );

        return () => unbind();
    }, []);

    useEffect(() => {
        const unbind = KeyBindings.bindOffsetToSubtitle(
            (event, offset) => {
                event.preventDefault();
                event.stopPropagation();
                handleOffsetChange(offset);
            },
            () => false,
            () => clock.time(length),
            () => subtitles
        );

        return () => unbind();
    }, [handleOffsetChange, subtitles, clock, length]);

    const handleShowControls = useCallback((showing) => setControlsShowing(showing), []);
    const handleSubtitlesToggle = useCallback(() => setSubtitlesEnabled(subtitlesEnabled => !subtitlesEnabled), []);

    const handleFullscreenToggle = useCallback(() => {
        if (fullscreen) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    }, [fullscreen]);

    const handleVolumeChange = useCallback((v) => {
        if (videoRef.current) {
            videoRef.current.volume = v;
        }
    }, []);

    const handlePopOutToggle = useCallback(() => {
        playerChannel.popOutToggle();
        if (popOut) {
            poppingInRef.current = true;
            window.close();
        }
    }, [playerChannel, popOut]);

    const handleCondensedModeToggle = useCallback(() => {
        playerChannel.condensedModeToggle();
    }, [playerChannel]);

    const handleClose = useCallback(() => {
        playerChannel.close();
        window.close();
    }, [playerChannel]);

    const handleHideSubtitlePlayerToggle = useCallback(() => {
        playerChannel.hideSubtitlePlayerToggle();
    }, [playerChannel]);

    const handleClick = useCallback(() => {
        if (playing) {
            playerChannel.pause();
        } else {
            playerChannel.play();
        }
    }, [playerChannel, playing]);

    const handleAlertClosed = useCallback(() => setAlertOpen(false), []);
    const {subtitleSize, subtitleColor, subtitleOutlineThickness, subtitleOutlineColor, subtitleBackgroundColor, subtitleBackgroundOpacity} = settingsProvider.subtitleSettings;
    const subtitleStyles = useMemo(() => makeSubtitleStyles(
        subtitleSize,
        subtitleColor,
        subtitleOutlineThickness,
        subtitleOutlineColor,
        subtitleBackgroundColor,
        subtitleBackgroundOpacity
    ), [
        subtitleSize,
        subtitleColor,
        subtitleOutlineThickness,
        subtitleOutlineColor,
        subtitleBackgroundColor,
        subtitleBackgroundOpacity
    ]);

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className={classes.root}>
            <video
                preload="auto"
                nocontrols={1}
                onClick={handleClick}
                className={controlsShowing ? classes.video : `${classes.cursorHidden} ${classes.video}`}
                ref={videoRefCallback}
                src={videoFile} />
            {subtitlesEnabled && (
                <div style={subtitleStyles}>
                    {showSubtitles.map(s => (<React.Fragment key={s.index}>{s.text}<br/></React.Fragment>))}
                </div>
            )}
            {fullscreen && (
                <Alert
                    open={alertOpen}
                    onClose={handleAlertClosed}
                    autoHideDuration={3000}
                    severity="success"
                >
                    {alert}
                </Alert>
            )}
            <Controls
                mousePositionRef={mousePositionRef}
                playing={playing}
                clock={clock}
                length={length}
                audioTracks={audioTracks}
                selectedAudioTrack={selectedAudioTrack}
                subtitlesToggle={subtitles && subtitles.length > 0}
                subtitlesEnabled={subtitlesEnabled}
                offsetEnabled={true}
                offset={offset}
                fullscreenEnabled={true}
                fullscreen={fullscreen}
                closeEnabled={!popOut}
                popOut={popOut}
                volumeEnabled={true}
                popOutEnabled={!isMobile}
                condensedModeToggleEnabled={true}
                condensedModeEnabled={condensedModeEnabled}
                hideSubtitlePlayerToggleEnabled={subtitles?.length > 0 && !popOut && !fullscreen}
                subtitlePlayerHidden={subtitlePlayerHidden}
                onShow={handleShowControls}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onAudioTrackSelected={handleAudioTrackSelected}
                onSubtitlesToggle={handleSubtitlesToggle}
                onFullscreenToggle={handleFullscreenToggle}
                onVolumeChange={handleVolumeChange}
                onOffsetChange={handleOffsetChange}
                onPopOutToggle={handlePopOutToggle}
                onCondensedModeToggle={handleCondensedModeToggle}
                onClose={handleClose}
                onHideSubtitlePlayerToggle={handleHideSubtitlePlayerToggle}
                settingsProvider={settingsProvider}
            />
        </div>
    );
}