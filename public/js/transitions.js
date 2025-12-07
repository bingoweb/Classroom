// Transitions Library - 15+ Slide Transition Effects
// GPU-accelerated transitions for visual spectacle

const TRANSITIONS = {
    // 1. Fade - Smooth fade transition
    fade: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            currentSlide.style.transition = `opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `opacity ${duration}ms ease-in-out`;
            currentSlide.style.opacity = '0';
            nextSlide.style.opacity = '1';
        },
        cleanup: (slide) => {
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 2. Slide Left
    'slide-left': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateX(100%)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateX(-100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateX(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 3. Slide Right
    'slide-right': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateX(-100%)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateX(100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateX(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 4. Slide Up
    'slide-up': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateY(100%)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateY(-100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateY(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 5. Slide Down
    'slide-down': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateY(-100%)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateY(100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateY(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 6. Zoom In
    'zoom-in': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'scale(0.5)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'scale(1.5)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'scale(1)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 7. Zoom Out
    'zoom-out': {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'scale(1.5)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'scale(0.5)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'scale(1)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 8. Rotate
    rotate: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'rotate(180deg) scale(0.5)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'rotate(-180deg) scale(0.5)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'rotate(0deg) scale(1)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 9. Flip (3D)
    flip: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            currentSlide.style.transformStyle = 'preserve-3d';
            nextSlide.style.transformStyle = 'preserve-3d';
            nextSlide.style.transform = 'rotateY(90deg)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'rotateY(-90deg)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'rotateY(0deg)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transformStyle = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 10. Blur
    blur: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            currentSlide.style.filter = 'blur(0px)';
            nextSlide.style.filter = 'blur(10px)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `filter ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `filter ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.filter = 'blur(10px)';
                currentSlide.style.opacity = '0';
                nextSlide.style.filter = 'blur(0px)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.filter = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 11. Glitch
    glitch: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            let glitchCount = 0;
            const glitchInterval = setInterval(() => {
                const offset = (Math.random() - 0.5) * 20;
                currentSlide.style.transform = `translateX(${offset}px)`;
                glitchCount++;
                if (glitchCount > 10) {
                    clearInterval(glitchInterval);
                    currentSlide.style.transition = `opacity ${duration * 0.3}ms ease-in-out`;
                    nextSlide.style.transition = `opacity ${duration * 0.3}ms ease-in-out`;
                    currentSlide.style.opacity = '0';
                    nextSlide.style.opacity = '1';
                    currentSlide.style.transform = '';
                    // Store interval ID for cleanup
                    currentSlide._glitchInterval = null;
                }
            }, duration / 15);
            // Store interval ID for cleanup
            currentSlide._glitchInterval = glitchInterval;
        },
        cleanup: (slide) => {
            if (slide._glitchInterval) {
                clearInterval(slide._glitchInterval);
                slide._glitchInterval = null;
            }
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 12. Particle (simplified - using opacity and scale)
    particle: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'scale(0)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'scale(1.5)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'scale(1)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 13. Morph (scale and rotate combination)
    morph: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'scale(0.8) rotate(10deg)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'scale(1.2) rotate(-10deg)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'scale(1) rotate(0deg)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 14. Wipe (clip-path animation)
    wipe: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.clipPath = 'inset(0 100% 0 0)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `clip-path ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `clip-path ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.clipPath = 'inset(0 0 0 100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.clipPath = 'inset(0 0 0 0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.clipPath = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 15. Dissolve (opacity with slight scale)
    dissolve: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'scale(0.95)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`;
            nextSlide.style.transition = `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.opacity = '0';
                currentSlide.style.transform = 'scale(1.05)';
                nextSlide.style.opacity = '1';
                nextSlide.style.transform = 'scale(1)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    },

    // 16. Cube (3D cube rotation)
    cube: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            const container = currentSlide.parentElement;
            container.style.perspective = '1000px';
            currentSlide.style.transformStyle = 'preserve-3d';
            nextSlide.style.transformStyle = 'preserve-3d';
            nextSlide.style.transform = 'rotateY(90deg)';
            nextSlide.style.opacity = '0';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'rotateY(-90deg)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'rotateY(0deg)';
                nextSlide.style.opacity = '1';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transformStyle = '';
            slide.style.transition = '';
            slide.style.opacity = '';
            if (slide.parentElement) {
                slide.parentElement.style.perspective = '';
            }
        }
    },

    // 17. Cover (slide from top covering)
    cover: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateY(-100%)';
            nextSlide.style.opacity = '1';
            nextSlide.style.zIndex = '10';
            currentSlide.style.transition = `opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateY(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
            slide.style.zIndex = '';
        }
    },

    // 18. Uncover (slide from bottom uncovering)
    uncover: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateY(100%)';
            nextSlide.style.opacity = '1';
            nextSlide.style.zIndex = '10';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateY(-100%)';
                currentSlide.style.opacity = '0';
                nextSlide.style.transform = 'translateY(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
            slide.style.zIndex = '';
        }
    },

    // 19. Push (push current slide out)
    push: {
        apply: (currentSlide, nextSlide, duration = 1000) => {
            nextSlide.style.transform = 'translateX(100%)';
            nextSlide.style.opacity = '1';
            currentSlide.style.transition = `transform ${duration}ms ease-in-out`;
            nextSlide.style.transition = `transform ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                currentSlide.style.transform = 'translateX(-100%)';
                nextSlide.style.transform = 'translateX(0)';
            }, 10);
        },
        cleanup: (slide) => {
            slide.style.transform = '';
            slide.style.transition = '';
            slide.style.opacity = '';
        }
    }
};

// Apply transition effect
function applyTransition(currentSlide, nextSlide, transitionType, duration = 1000) {
    if (!TRANSITIONS[transitionType]) {
        // Fallback to fade if transition not found
        transitionType = 'fade';
    }

    const transition = TRANSITIONS[transitionType];
    
    // Ensure slides are positioned correctly
    currentSlide.style.position = 'absolute';
    nextSlide.style.position = 'absolute';
    currentSlide.style.top = '0';
    currentSlide.style.left = '0';
    nextSlide.style.top = '0';
    nextSlide.style.left = '0';
    currentSlide.style.width = '100%';
    currentSlide.style.height = '100%';
    nextSlide.style.width = '100%';
    nextSlide.style.height = '100%';

    // Apply transition
    transition.apply(currentSlide, nextSlide, duration);

    // Cleanup after transition
    setTimeout(() => {
        transition.cleanup(currentSlide);
        transition.cleanup(nextSlide);
    }, duration + 100);
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.TRANSITIONS = TRANSITIONS;
    window.applyTransition = applyTransition;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TRANSITIONS, applyTransition };
}

