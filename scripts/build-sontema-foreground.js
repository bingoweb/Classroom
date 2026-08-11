#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'public/assets/sontema.png');
const OUTPUT_PATH = path.join(ROOT, 'public/assets/sontema-foreground.png');

const SEED_LUMINANCE = 10;
const MIN_OPENING_PIXELS = 100_000;
const EXPECTED_OPENINGS = 8;
const OPENING_GROWTH_PADDING = 10;

function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function readPngAsRgba(filePath) {
    const png = fs.readFileSync(filePath);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => png[index] === value)) {
        throw new Error(`${filePath} is not a PNG`);
    }

    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const bitDepth = png[24];
    const colorType = png[25];
    const interlace = png[28];
    if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
        throw new Error('sontema.png must be an 8-bit non-interlaced RGB or RGBA PNG');
    }

    const idat = [];
    for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        const type = png.subarray(offset + 4, offset + 8).toString('ascii');
        if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
        offset += 12 + length;
        if (type === 'IEND') break;
    }

    const decoded = zlib.inflateSync(Buffer.concat(idat));
    const bytesPerPixel = colorType === 6 ? 4 : 3;
    const stride = width * bytesPerPixel;
    const pixels = Buffer.alloc(width * height * bytesPerPixel);
    let sourceOffset = 0;
    let previous = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
        const filter = decoded[sourceOffset++];
        const current = Buffer.alloc(stride);

        for (let x = 0; x < stride; x += 1) {
            const raw = decoded[sourceOffset++];
            const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
            const up = previous[x] || 0;
            const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = up;
            else if (filter === 3) predictor = Math.floor((left + up) / 2);
            else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
            else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
            current[x] = (raw + predictor) & 0xff;
        }

        current.copy(pixels, y * stride);
        previous = current;
    }

    const rgba = Buffer.alloc(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
        const source = index * bytesPerPixel;
        const target = index * 4;
        rgba[target] = pixels[source];
        rgba[target + 1] = pixels[source + 1];
        rgba[target + 2] = pixels[source + 2];
        rgba[target + 3] = colorType === 6 ? pixels[source + 3] : 255;
    }

    return { width, height, colorType, rgba };
}

function luminanceAt(rgba, pixelIndex) {
    const offset = pixelIndex * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    return (54 * r + 183 * g + 19 * b) >> 8;
}

function findOpeningComponents(width, height, rgba) {
    const pixelCount = width * height;
    const seed = new Uint8Array(pixelCount);
    const seen = new Uint8Array(pixelCount);

    for (let index = 0; index < pixelCount; index += 1) {
        if (rgba[(index * 4) + 3] > 0 && luminanceAt(rgba, index) <= SEED_LUMINANCE) {
            seed[index] = 1;
        }
    }

    const components = [];
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const start = (y * width) + x;
            if (!seed[start] || seen[start]) continue;

            const stack = [start];
            const pixels = [];
            seen[start] = 1;
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;

            while (stack.length) {
                const index = stack.pop();
                const py = Math.floor(index / width);
                const px = index - (py * width);
                pixels.push(index);
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);

                const neighbours = [];
                if (px > 0) neighbours.push(index - 1);
                if (px + 1 < width) neighbours.push(index + 1);
                if (py > 0) neighbours.push(index - width);
                if (py + 1 < height) neighbours.push(index + width);

                for (const neighbour of neighbours) {
                    if (!seed[neighbour] || seen[neighbour]) continue;
                    seen[neighbour] = 1;
                    stack.push(neighbour);
                }
            }

            if (pixels.length >= MIN_OPENING_PIXELS) {
                components.push({ pixels, minX, minY, maxX, maxY });
            }
        }
    }

    components.sort((a, b) => b.pixels.length - a.pixels.length);
    if (components.length !== EXPECTED_OPENINGS) {
        throw new Error(`Expected ${EXPECTED_OPENINGS} dark openings, found ${components.length}`);
    }
    return components;
}

function touchesMask(mask, index, width, height) {
    const y = Math.floor(index / width);
    const x = index - (y * width);
    for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (mask[(ny * width) + nx]) return true;
        }
    }
    return false;
}

function expandMask(mask, width, height, rgba, iterations, predicate) {
    const pixelCount = width * height;
    for (let pass = 0; pass < iterations; pass += 1) {
        const next = mask.slice();
        for (let index = 0; index < pixelCount; index += 1) {
            if (mask[index] || !touchesMask(mask, index, width, height)) continue;
            if (predicate(index, rgba)) next[index] = 1;
        }
        mask.set(next);
    }
}

function buildOpeningGrowthRegion(width, height, components) {
    const allowed = new Uint8Array(width * height);
    for (const component of components) {
        const minX = Math.max(0, component.minX - OPENING_GROWTH_PADDING);
        const minY = Math.max(0, component.minY - OPENING_GROWTH_PADDING);
        const maxX = Math.min(width - 1, component.maxX + OPENING_GROWTH_PADDING);
        const maxY = Math.min(height - 1, component.maxY + OPENING_GROWTH_PADDING);
        for (let y = minY; y <= maxY; y += 1) {
            const row = y * width;
            for (let x = minX; x <= maxX; x += 1) allowed[row + x] = 1;
        }
    }
    return allowed;
}

function componentCenter(component) {
    return {
        x: (component.minX + component.maxX) / 2,
        y: (component.minY + component.maxY) / 2
    };
}

function findMiddleComponent(components, width, height, verticalHalf) {
    return components.find(component => {
        const center = componentCenter(component);
        const isMiddleColumn = center.x > width * 0.3 && center.x < width * 0.7;
        const isTop = center.y < height * 0.5;
        return isMiddleColumn && (verticalHalf === 'top' ? isTop : !isTop);
    });
}

function findLeftMiddleComponent(components, width, height) {
    return components.find(component => {
        const center = componentCenter(component);
        return center.x < width * 0.3 && center.y > height * 0.3 && center.y < height * 0.7;
    });
}

function isRedBrownArtwork(rgba, index, minRed = 36) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    return r >= minRed && r >= g + 12 && r >= b + 18;
}

function isDeepMaroonArtwork(rgba, index) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const lum = luminanceAt(rgba, index);
    return lum <= 32 && r >= 8 && r >= g + 2 && r >= b + 3;
}

function isNearBlackUpperCurtainShadow(rgba, index) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const lum = luminanceAt(rgba, index);
    return lum <= 8 && r >= 4 && r < 8 && r >= g + 3 && r >= b + 3;
}

function isWarmLampArtwork(rgba, index) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    return r >= 80 && g >= 24 && r >= g + 28 && g >= b + 8;
}

function isDarkWarmLampEdge(rgba, index) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : Math.round(((max - min) * 255) / max);
    return luminanceAt(rgba, index) > SEED_LUMINANCE
        && max >= 45
        && saturation >= 75
        && r >= g + 12
        && r >= b + 18;
}

function isAttendancePencilArtwork(rgba, index) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const coolBlueTeal = g >= 50 && b >= 65 && g >= r + 18 && b >= r + 24;
    const warmYellow = r >= 100 && g >= 70 && r >= g + 22 && g >= b + 32;
    return coolBlueTeal || warmYellow;
}

function isStrongChromaticArtwork(rgba, index, minValue = 45, minSaturation = 75) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < minValue || max === 0) return false;
    const saturation = Math.round(((max - min) * 255) / max);
    return saturation >= minSaturation;
}

function buildLocalArtworkPreserveMask(width, height, rgba, components) {
    const preserve = new Uint8Array(width * height);
    const classTv = findMiddleComponent(components, width, height, 'bottom');
    const noise = findMiddleComponent(components, width, height, 'top');
    const attendance = findLeftMiddleComponent(components, width, height);

    if (!classTv || !noise || !attendance) {
        throw new Error('Could not identify Class TV, noise and attendance openings for local artwork protection');
    }

    // All eight openings share one mask failure mode: the first growth pass
    // deliberately clears every immediate neighbour of the verified dark seed,
    // regardless of colour. That is correct for neutral matte contamination,
    // but it also removes saturated anti-aliased artwork where a painted frame,
    // leaf, curtain or prop directly touches the opening. Preserve only strongly
    // chromatic pixels in this single 8-neighbour seed ring. The restriction to
    // the verified components keeps unrelated dark decorations out of the rule,
    // and neutral halo pixels remain governed by the existing cleanup logic.
    const verifiedOpeningSeed = new Uint8Array(width * height);
    for (const component of components) {
        for (const index of component.pixels) verifiedOpeningSeed[index] = 1;
    }
    for (const component of components) {
        for (const index of component.pixels) {
            const y = Math.floor(index / width);
            const x = index - (y * width);
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if (!dx && !dy) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const neighbour = (ny * width) + nx;
                    if (verifiedOpeningSeed[neighbour]) continue;
                    if (isStrongChromaticArtwork(rgba, neighbour)) preserve[neighbour] = 1;
                }
            }
        }
    }

    // Class TV: the 4K source contains red/brown curtain pixels inside the dark
    // opening component's bounding region. They are foreground artwork, not
    // opening fill, so preserve those chromatic pixels from alpha keying.
    const tvPad = 20;
    const tvMinX = Math.max(0, classTv.minX - tvPad);
    const tvMaxX = Math.min(width - 1, classTv.maxX + tvPad);
    const tvMinY = Math.max(0, classTv.minY - tvPad);
    const tvMaxY = Math.min(height - 1, classTv.maxY + tvPad);
    for (let y = tvMinY; y <= tvMaxY; y += 1) {
        const row = y * width;
        for (let x = tvMinX; x <= tvMaxX; x += 1) {
            const index = row + x;
            if (isRedBrownArtwork(rgba, index, 36) || isDeepMaroonArtwork(rgba, index)) {
                preserve[index] = 1;
            }
        }
    }

    // Class TV upper curtain: a few deepest fold pixels in the 4K artwork are
    // only RGB 4..7 red over near-black. Keep this protection in a very narrow
    // strip around the opening's top edge so true black opening fill remains
    // transparent and the side/noise protection paths stay untouched.
    const upperCurtainMinY = Math.max(0, classTv.minY - tvPad);
    const upperCurtainMaxY = Math.min(height - 1, classTv.minY + 20);
    for (let y = upperCurtainMinY; y <= upperCurtainMaxY; y += 1) {
        const row = y * width;
        for (let x = tvMinX; x <= tvMaxX; x += 1) {
            const index = row + x;
            if (isNearBlackUpperCurtainShadow(rgba, index)) preserve[index] = 1;
        }
    }

    // Protect the warm gold/orange lamp arms that sit above the Class TV
    // opening. Their enclosed negative spaces are cleared separately below,
    // but the lamp itself must stay fully opaque and crisp.
    const openingWidth = classTv.maxX - classTv.minX + 1;
    const lampMinX = Math.max(0, classTv.minX + Math.round(openingWidth * 0.28));
    const lampMaxX = Math.min(width - 1, classTv.minX + Math.round(openingWidth * 0.72));
    const lampMinY = Math.max(0, classTv.minY - 150);
    const lampMaxY = Math.min(height - 1, classTv.minY - 20);
    for (let y = lampMinY; y <= lampMaxY; y += 1) {
        const row = y * width;
        for (let x = lampMinX; x <= lampMaxX; x += 1) {
            const index = row + x;
            if (isWarmLampArtwork(rgba, index)) preserve[index] = 1;
        }
    }

    // Attendance: the right-edge pencil cluster overlaps the dark opening
    // boundary. Preserve the blue/teal/yellow pencil artwork plus a tiny dark
    // contour halo, while leaving genuine near-black opening fill untouched.
    const pencilMinX = Math.max(0, attendance.maxX - 140);
    const pencilMaxX = Math.min(width - 1, attendance.maxX + 10);
    const pencilMinY = Math.max(0, attendance.minY + 180);
    const pencilMaxY = Math.min(height - 1, attendance.minY + 360);
    const pencilMask = new Uint8Array(width * height);
    for (let y = pencilMinY; y <= pencilMaxY; y += 1) {
        const row = y * width;
        for (let x = pencilMinX; x <= pencilMaxX; x += 1) {
            const index = row + x;
            if (isAttendancePencilArtwork(rgba, index)) pencilMask[index] = 1;
        }
    }
    expandMask(pencilMask, width, height, rgba, 2, index => {
        const y = Math.floor(index / width);
        const x = index - (y * width);
        return x >= pencilMinX && x <= pencilMaxX && y >= pencilMinY && y <= pencilMaxY
            && luminanceAt(rgba, index) > 3;
    });
    for (let y = pencilMinY; y <= pencilMaxY; y += 1) {
        const row = y * width;
        for (let x = pencilMinX; x <= pencilMaxX; x += 1) {
            const index = row + x;
            if (pencilMask[index]) preserve[index] = 1;
        }
    }

    // Attendance lower decorations: the books, loose desk pencils, pencil cup,
    // lantern and their coloured edge pixels overlap the lower half of the
    // dark opening component. The global opening-growth pass can otherwise
    // consume saturated anti-aliased artwork pixels because they sit only a
    // few pixels from the verified dark seed. Protect only strongly chromatic
    // source pixels in this attendance-local strip; dark opening fill remains
    // governed by the existing transparent mask and is not re-opaqued here.
    const attendanceHeight = attendance.maxY - attendance.minY + 1;
    const decorMinX = Math.max(0, attendance.minX);
    const decorMaxX = Math.min(width - 1, attendance.maxX);
    const decorMinY = Math.max(0, attendance.minY + Math.round(attendanceHeight * 0.49));
    const decorMaxY = Math.min(height - 1, attendance.maxY + 10);
    for (let y = decorMinY; y <= decorMaxY; y += 1) {
        const row = y * width;
        for (let x = decorMinX; x <= decorMaxX; x += 1) {
            const index = row + x;
            if (isStrongChromaticArtwork(rgba, index)) preserve[index] = 1;
        }
    }

    // Noise: only protect the right-side brown/red decoration reported as
    // clipped. Keep the rest of the opening mask unchanged.
    const noiseMinX = Math.max(0, noise.maxX - 130);
    const noiseMaxX = Math.min(width - 1, noise.maxX + 20);
    const noiseMinY = Math.max(0, noise.minY - 20);
    const noiseMaxY = Math.min(height - 1, noise.maxY + 20);
    for (let y = noiseMinY; y <= noiseMaxY; y += 1) {
        const row = y * width;
        for (let x = noiseMinX; x <= noiseMaxX; x += 1) {
            const index = row + x;
            if (isRedBrownArtwork(rgba, index, 48)) preserve[index] = 1;
        }
    }

    return preserve;
}

function clearClassTvLampArmGaps(transparent, width, height, rgba, components, preserve) {
    const classTv = findMiddleComponent(components, width, height, 'bottom');
    if (!classTv) throw new Error('Could not identify the Class TV opening for lamp-gap cleanup');

    const openingWidth = classTv.maxX - classTv.minX + 1;
    const zoneMinX = Math.max(0, classTv.minX + Math.round(openingWidth * 0.30));
    const zoneMaxX = Math.min(width - 1, classTv.minX + Math.round(openingWidth * 0.70));
    const zoneMinY = Math.max(0, classTv.minY - 135);
    const zoneMaxY = Math.min(height - 1, classTv.minY - 30);
    const zoneWidth = zoneMaxX - zoneMinX + 1;
    const zoneHeight = zoneMaxY - zoneMinY + 1;
    const seed = new Uint8Array(zoneWidth * zoneHeight);
    const seen = new Uint8Array(zoneWidth * zoneHeight);

    for (let y = zoneMinY; y <= zoneMaxY; y += 1) {
        for (let x = zoneMinX; x <= zoneMaxX; x += 1) {
            const globalIndex = (y * width) + x;
            const localIndex = ((y - zoneMinY) * zoneWidth) + (x - zoneMinX);
            if (!preserve[globalIndex] && luminanceAt(rgba, globalIndex) <= 20) {
                seed[localIndex] = 1;
            }
        }
    }

    const gapComponents = [];
    for (let localY = 0; localY < zoneHeight; localY += 1) {
        for (let localX = 0; localX < zoneWidth; localX += 1) {
            const start = (localY * zoneWidth) + localX;
            if (!seed[start] || seen[start]) continue;

            const stack = [start];
            const pixels = [];
            seen[start] = 1;
            let minX = localX;
            let maxX = localX;
            let minY = localY;
            let maxY = localY;

            while (stack.length) {
                const localIndex = stack.pop();
                const py = Math.floor(localIndex / zoneWidth);
                const px = localIndex - (py * zoneWidth);
                pixels.push(((py + zoneMinY) * width) + px + zoneMinX);
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);

                const neighbours = [];
                if (px > 0) neighbours.push(localIndex - 1);
                if (px + 1 < zoneWidth) neighbours.push(localIndex + 1);
                if (py > 0) neighbours.push(localIndex - zoneWidth);
                if (py + 1 < zoneHeight) neighbours.push(localIndex + zoneWidth);
                for (const neighbour of neighbours) {
                    if (!seed[neighbour] || seen[neighbour]) continue;
                    seen[neighbour] = 1;
                    stack.push(neighbour);
                }
            }

            if (pixels.length >= 1_500 && pixels.length <= 5_000) {
                gapComponents.push({
                    pixels,
                    minX: minX + zoneMinX,
                    maxX: maxX + zoneMinX,
                    minY: minY + zoneMinY,
                    maxY: maxY + zoneMinY
                });
            }
        }
    }

    if (gapComponents.length !== 3) {
        throw new Error(`Expected 3 enclosed Class TV lamp-arm gaps, found ${gapComponents.length}`);
    }

    for (const gap of gapComponents) {
        const gapMask = new Uint8Array(width * height);
        for (const index of gap.pixels) {
            if (!isDarkWarmLampEdge(rgba, index)) gapMask[index] = 1;
        }
        expandMask(gapMask, width, height, rgba, 2, index => {
            const y = Math.floor(index / width);
            const x = index - (y * width);
            return x >= gap.minX && x <= gap.maxX && y >= gap.minY && y <= gap.maxY
                && !preserve[index]
                && !isDarkWarmLampEdge(rgba, index)
                && luminanceAt(rgba, index) <= 48;
        });
        for (let y = gap.minY; y <= gap.maxY; y += 1) {
            const row = y * width;
            for (let x = gap.minX; x <= gap.maxX; x += 1) {
                const index = row + x;
                if (gapMask[index]) transparent[index] = 1;
            }
        }
    }
}

function clearNoiseResidualBlackIsland(transparent, width, height, rgba, components, preserve) {
    const noise = findMiddleComponent(components, width, height, 'top');
    if (!noise) throw new Error('Could not identify the noise opening for local black-island cleanup');

    const openingWidth = noise.maxX - noise.minX + 1;
    const openingHeight = noise.maxY - noise.minY + 1;
    const minX = Math.max(noise.minX, noise.maxX - Math.round(openingWidth * 0.03));
    const maxX = Math.min(noise.maxX, noise.maxX - 4);
    const minY = Math.max(noise.minY, noise.minY + Math.round(openingHeight * 0.72));
    const maxY = Math.min(noise.maxY, noise.minY + Math.round(openingHeight * 0.92));

    for (let y = minY; y <= maxY; y += 1) {
        const row = y * width;
        for (let x = minX; x <= maxX; x += 1) {
            const index = row + x;
            if (preserve[index] || isStrongChromaticArtwork(rgba, index)) continue;
            if (luminanceAt(rgba, index) <= 35) {
                transparent[index] = 1;
            }
        }
    }
}

function clearAttendanceNeutralHalo(transparent, width, height, rgba, components) {
    const attendance = findLeftMiddleComponent(components, width, height);
    if (!attendance) throw new Error('Could not identify the attendance opening for neutral-halo cleanup');

    // The pencil cup sits exactly on the attendance opening's right edge. A
    // handful of near-white source pixels just outside the dark seed component
    // survive as opaque foreground flecks. Clear only neutral pixels that sit
    // within a few pixels of the already verified opening; keep chromatic and
    // warm contour pixels untouched.
    const minX = Math.max(0, attendance.maxX - 8);
    const maxX = Math.min(width - 1, attendance.maxX + 8);
    const minY = Math.max(0, attendance.minY + 315);
    const maxY = Math.min(height - 1, attendance.minY + 350);
    const radius = 6;

    for (let y = minY; y <= maxY; y += 1) {
        const row = y * width;
        for (let x = minX; x <= maxX; x += 1) {
            const index = row + x;
            if (transparent[index]) continue;

            const offset = index * 4;
            const r = rgba[offset];
            const g = rgba[offset + 1];
            const b = rgba[offset + 2];
            const lum = luminanceAt(rgba, index);
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            if (lum < 240 || chroma > 32) continue;

            let nearOpening = false;
            for (let dy = -radius; dy <= radius && !nearOpening; dy += 1) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                const remaining = radius - Math.abs(dy);
                for (let dx = -remaining; dx <= remaining; dx += 1) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;
                    if (transparent[(ny * width) + nx]) {
                        nearOpening = true;
                        break;
                    }
                }
            }

            if (nearOpening) transparent[index] = 1;
        }
    }
}

function buildAlpha(width, height, rgba, components) {
    const pixelCount = width * height;
    const transparent = new Uint8Array(pixelCount);
    for (const component of components) {
        for (const index of component.pixels) transparent[index] = 1;
    }

    // The 4K source has dark decorations physically close to several openings.
    // Keep growth inside a narrow box around each verified seed component so a
    // dark curtain/plant/character can never become connected mask material.
    const allowed = buildOpeningGrowthRegion(width, height, components);

    // Remove neutral/dark matte contamination in the first contour, then follow
    // only the remaining genuinely dark edge pixels for a few more pixels.
    // Strongly chromatic artwork is an explicit barrier in every growth pass so
    // the mask cannot tunnel through painted frame/prop anti-aliasing.
    expandMask(transparent, width, height, rgba, 1, (index, buffer) => (
        allowed[index] === 1 && !isStrongChromaticArtwork(buffer, index)
    ));
    expandMask(transparent, width, height, rgba, 3, (index, buffer) => (
        allowed[index] === 1
        && luminanceAt(buffer, index) <= 48
        && !isStrongChromaticArtwork(buffer, index)
    ));

    const preserve = buildLocalArtworkPreserveMask(width, height, rgba, components);
    for (let index = 0; index < pixelCount; index += 1) {
        if (preserve[index]) transparent[index] = 0;
    }
    clearAttendanceNeutralHalo(transparent, width, height, rgba, components);
    clearClassTvLampArmGaps(transparent, width, height, rgba, components, preserve);
    clearNoiseResidualBlackIsland(transparent, width, height, rgba, components, preserve);

    const output = Buffer.from(rgba);
    const partial = new Uint8Array(pixelCount);

    for (let index = 0; index < pixelCount; index += 1) {
        if (transparent[index]) {
            output[(index * 4) + 3] = 0;
            continue;
        }
        if (preserve[index]) continue;
        if (!touchesMask(transparent, index, width, height)) continue;

        const lum = luminanceAt(rgba, index);
        if (lum > 190) continue;

        // Preserve a one-pixel straight-alpha transition. Very dark residual
        // contour pixels carry almost no coverage, while brighter artwork edge
        // pixels retain proportionally more of the original frame colour.
        const alpha = Math.max(16, Math.min(224, Math.round(((lum - 12) / 178) * 224)));
        output[(index * 4) + 3] = Math.min(output[(index * 4) + 3], alpha);
        partial[index] = 1;
    }

    return { output, transparent, partial };
}

let crcTable = null;
function crc32(buffer) {
    if (!crcTable) {
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n += 1) {
            let c = n;
            for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
    return Buffer.concat([length, typeBuffer, data, crc]);
}

function writeRgbaPng(filePath, width, height, rgba) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = width * 4;
    const scanlines = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y += 1) {
        const target = y * (stride + 1);
        scanlines[target] = 0;
        rgba.copy(scanlines, target + 1, y * stride, (y + 1) * stride);
    }

    const encoded = Buffer.concat([
        signature,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
        pngChunk('IEND')
    ]);
    fs.writeFileSync(filePath, encoded);
}

function main() {
    const { width, height, colorType, rgba } = readPngAsRgba(SOURCE_PATH);
    const components = findOpeningComponents(width, height, rgba);
    const { output, transparent, partial } = buildAlpha(width, height, rgba, components);
    writeRgbaPng(OUTPUT_PATH, width, height, output);

    const transparentCount = transparent.reduce((sum, value) => sum + value, 0);
    const partialCount = partial.reduce((sum, value) => sum + value, 0);
    console.log(`Built ${path.relative(ROOT, OUTPUT_PATH)} (${width}x${height}, source-color-type=${colorType})`);
    console.log(`transparent=${transparentCount} partial-edge=${partialCount}`);
    components
        .slice()
        .sort((a, b) => a.minY - b.minY || a.minX - b.minX)
        .forEach((component, index) => {
            console.log(
                `opening ${index + 1}: ${component.pixels.length} px ` +
                `[${component.minX},${component.minY}]..[${component.maxX},${component.maxY}]`
            );
        });
}

main();
