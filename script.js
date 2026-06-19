   const video = document.getElementById('camera-view');
    const canvas = document.getElementById('final-canvas');
    const ctx = canvas.getContext('2d');
    const frameSidebar = document.getElementById('frame-sidebar');
    const startBtn = document.getElementById('start-btn');
    const downloadBtn = document.getElementById('download-btn');
    const flashEl = document.getElementById('flash');

    let capturedPhotos = [];
    let currentFilter = 'none';
    let currentFrameImg = document.querySelector('.frame-thumb.selected');

    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => video.srcObject = stream);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            video.style.filter = currentFilter;
            if(capturedPhotos.length > 0) renderFinal();
        }
    });

    document.querySelectorAll('.frame-thumb').forEach(img => {
        img.onclick = () => {
            document.querySelectorAll('.frame-thumb').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            currentFrameImg = img;
            renderFinal(); // Apply new frame to existing images
        }
    });

    startBtn.onclick = () => {
        const targetCount = 3;

        if (capturedPhotos.length === 0) {
            video.style.display = 'block';
            canvas.style.display = 'none';
        }

        flash();
        snap();

        if (capturedPhotos.length < targetCount) {
            startBtn.innerText = `Take Photo (${capturedPhotos.length + 1}/${targetCount})`;
        } else {
            video.style.display = 'none';
            canvas.style.display = 'block';
            frameSidebar.classList.add('unlocked');
            downloadBtn.style.display = 'inline-block';
            startBtn.innerText = "Restart";
            startBtn.onclick = () => location.reload();
            renderFinal();
        }
    };

    function flash() {
        flashEl.style.opacity = 1;
        setTimeout(() => flashEl.style.opacity = 0, 100);
    }

    function snap() {
        const temp = document.createElement('canvas');
        temp.width = video.videoWidth;
        temp.height = video.videoHeight;
        const tCtx = temp.getContext('2d');
        
        tCtx.translate(temp.width, 0);
        tCtx.scale(-1, 1);
        tCtx.drawImage(video, 0, 0);
        capturedPhotos.push(temp);
    }

    function renderFinal() {
        if (capturedPhotos.length === 0) return;

        const count = capturedPhotos.length;
        const w = 800; // Canvas width
        const h = (count === 3) ? 2400 : 3200; // Canvas height
        canvas.width = w;
        canvas.height = h;

        const frameId = currentFrameImg.dataset.id;

        ctx.filter = 'none';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const drawPhotos = () => {
            const padding = 100;
            const slotW = w - (padding * 2);
            const slotH = (h - (padding * (count + 1))) / count;

            capturedPhotos.forEach((imgCanvas, i) => {
                const yPos = padding + (i * (slotH + padding));
                
                const sRatio = imgCanvas.width / imgCanvas.height;
                const dRatio = slotW / slotH;
                let sx, sy, sWidth, sHeight;

                if (sRatio > dRatio) {
                    sHeight = imgCanvas.height;
                    sWidth = imgCanvas.height * dRatio;
                    sx = (imgCanvas.width - sWidth) / 2;
                    sy = 0;
                } else {
                    sWidth = imgCanvas.width;
                    sHeight = imgCanvas.width / dRatio;
                    sx = 0;
                    sy = (imgCanvas.height - sHeight) / 2;
                }

                // Draw cropped image with 10px radius
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(padding, yPos, slotW, slotH, 30);
                ctx.clip();
                ctx.filter = currentFilter;
                ctx.drawImage(imgCanvas, sx, sy, sWidth, sHeight, padding, yPos, slotW, slotH);
                ctx.restore();

                ctx.beginPath();
                ctx.lineWidth = 10;

                if (frameId === '2') {
                    ctx.strokeStyle = '#234d71';
                    ctx.roundRect(padding, yPos, slotW, slotH, 30);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = 'white';
                    ctx.setLineDash([12, 12]);
                    ctx.roundRect(padding - 15, yPos - 15, slotW + 30, slotH + 30, 45);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    ctx.strokeStyle = 'white';
                    ctx.roundRect(padding, yPos, slotW, slotH, 30);
                    ctx.stroke();
                }
            });
            ctx.filter = 'none';
        };

        const drawImageFit = (img) => {
            const fRatio = img.naturalWidth / img.naturalHeight;
            const cRatio = w / h;
            let dw, dh, dx, dy;

            if (fRatio > cRatio) {
                dh = h;
                dw = h * fRatio;
                dx = (w - dw) / 2;
                dy = 0;
            } else {
                dw = w;
                dh = w / fRatio;
                dx = 0;
                dy = (h - dh) / 2;
            }
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
            return { dx, dy, dw, dh };
        };

        if (frameId === '2') {
            
            drawPhotos();

            const scOverlay = document.getElementById('sc-overlay');
            if (scOverlay) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');

                tCtx.drawImage(scOverlay, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                                    data[i + 3] = 0;
                                }
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) {
                    
                    ctx.drawImage(scOverlay, 0, 0, w, h);
                }
            }

            // 3. Top Layer (StudentCouncilLayer2)
            const layer2 = document.getElementById('layer2-img');
            if (layer2) {
                ctx.drawImage(layer2, 0, 0, w, h);
            }

        } else if (frameId === '6') {
            // FRAME 6: Pink (3 Layers: Photos + PinkLayer1 + PinkLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. PinkLayer1 (Remove White)
            const pinkL1 = document.getElementById('pink-layer1');
            if (pinkL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(pinkL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(pinkL1, 0, 0, w, h); }
            }

            // 3. PinkLayer2
            const pinkL2 = document.getElementById('pink-layer2');
            if (pinkL2) {
                ctx.drawImage(pinkL2, 0, 0, w, h);
            }

        } else if (frameId === '7') {
            // FRAME 7: Mean Girls (3 Layers: Photos + MeanGirlsLayer1 + MeanGirlsLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. MeanGirlsLayer1 (Remove White)
            const mgL1 = document.getElementById('mg-layer1');
            if (mgL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(mgL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(mgL1, 0, 0, w, h); }
            }

            // 3. MeanGirlsLayer2
            const mgL2 = document.getElementById('mg-layer2');
            if (mgL2) {
                ctx.drawImage(mgL2, 0, 0, w, h);
            }

        } else if (frameId === '8') {
            // FRAME 8: Kitten (3 Layers: Photos + KittenLayer1 + KittenLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. KittenLayer1 (Remove White)
            const kittenL1 = document.getElementById('kitten-layer1');
            if (kittenL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(kittenL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(kittenL1, 0, 0, w, h); }
            }

            // 3. KittenLayer2
            const kittenL2 = document.getElementById('kitten-layer2');
            if (kittenL2) {
                ctx.drawImage(kittenL2, 0, 0, w, h);
            }

        } else if (frameId === '9') {
            // FRAME 9: Blue (3 Layers: Photos + BlueLayer1 + BlueLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. BlueLayer1 (Remove White)
            const blueL1 = document.getElementById('blue-layer1');
            if (blueL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(blueL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(blueL1, 0, 0, w, h); }
            }

            // 3. BlueLayer2
            const blueL2 = document.getElementById('blue-layer2');
            if (blueL2) {
                ctx.drawImage(blueL2, 0, 0, w, h);
            }

        } else if (frameId === '10') {
            // FRAME 10: Black (3 Layers: Photos + BlackLayer1 + BlackLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. BlackLayer1 (Remove White)
            const blackL1 = document.getElementById('black-layer1');
            if (blackL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(blackL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(blackL1, 0, 0, w, h); }
            }

            // 3. BlackLayer2
            const blackL2 = document.getElementById('black-layer2');
            if (blackL2) {
                ctx.drawImage(blackL2, 0, 0, w, h);
            }

        } else if (frameId === '11') {
            // FRAME 11: Nerd (3 Layers: Photos + NerdLayer1 + NerdLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. NerdLayer1 (Remove White)
            const nerdL1 = document.getElementById('nerd-layer1');
            if (nerdL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(nerdL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(nerdL1, 0, 0, w, h); }
            }

            // 3. NerdLayer2
            const nerdL2 = document.getElementById('nerd-layer2');
            if (nerdL2) {
                ctx.drawImage(nerdL2, 0, 0, w, h);
            }

        } else if (frameId === '12') {
            // FRAME 12: Receipt (3 Layers: Photos + ReceiptLayer1 + ReceiptLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. ReceiptLayer1 (Remove White)
            const receiptL1 = document.getElementById('receipt-layer1');
            if (receiptL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(receiptL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(receiptL1, 0, 0, w, h); }
            }

            // 3. ReceiptLayer2
            const receiptL2 = document.getElementById('receipt-layer2');
            if (receiptL2) {
                ctx.drawImage(receiptL2, 0, 0, w, h);
            }

        } else if (frameId === '13') {
            // FRAME 13: Vigi (3 Layers: Photos + VigiLayer1 + VigiLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. VigiLayer1 (Remove White)
            const vigiL1 = document.getElementById('vigi-layer1');
            if (vigiL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(vigiL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(vigiL1, 0, 0, w, h); }
            }

            // 3. VigiLayer2
            const vigiL2 = document.getElementById('vigi-layer2');
            if (vigiL2) {
                ctx.drawImage(vigiL2, 0, 0, w, h);
            }

        } else if (frameId === '14') {
            // FRAME 14: Techno (3 Layers: Photos + TechnoLayer1 + TechnoLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. TechnoLayer1 (Remove White)
            const technoL1 = document.getElementById('techno-layer1');
            if (technoL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(technoL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(technoL1, 0, 0, w, h); }
            }

            // 3. TechnoLayer2
            const technoL2 = document.getElementById('techno-layer2');
            if (technoL2) {
                ctx.drawImage(technoL2, 0, 0, w, h);
            }

        } else if (frameId === '15') {
            // FRAME 15: Shrek (3 Layers: Photos + ShrekLayer1 + ShrekLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. ShrekLayer1 (Remove White)
            const shrekL1 = document.getElementById('shrek-layer1');
            if (shrekL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(shrekL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(shrekL1, 0, 0, w, h); }
            }

            // 3. ShrekLayer2
            const shrekL2 = document.getElementById('shrek-layer2');
            if (shrekL2) {
                ctx.drawImage(shrekL2, 0, 0, w, h);
            }

        } else if (frameId === '16') {
            // FRAME 16: Sanrio (3 Layers: Photos + SanrioLayer1 + SanrioLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. SanrioLayer1 (Remove Black)
            const sanrioL1 = document.getElementById('sanrio-layer1');
            if (sanrioL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(sanrioL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(sanrioL1, 0, 0, w, h); }
            }

            // 3. SanrioLayer2
            const sanrioL2 = document.getElementById('sanrio-layer2');
            if (sanrioL2) {
                ctx.drawImage(sanrioL2, 0, 0, w, h);
            }

        } else if (frameId === '17') {
            // FRAME 17: Donato (3 Layers: Photos + DonatoLayer1 + DonatoLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. DonatoLayer1 (Remove White)
            const donatoL1 = document.getElementById('donato-layer1');
            if (donatoL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(donatoL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) { ctx.drawImage(donatoL1, 0, 0, w, h); }
            }

            // 3. DonatoLayer2
            const donatoL2 = document.getElementById('donato-layer2');
            if (donatoL2) {
                ctx.drawImage(donatoL2, 0, 0, w, h);
            }

        } else if (frameId === '3') {
            // FRAME 3: Stag (3 Layers: Photos + StagLayer1 + StagLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. StagLayer1 (Remove White)
            const stagL1 = document.getElementById('stag-layer1');
            if (stagL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');

                tCtx.drawImage(stagL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;

                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                            if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                                    data[i + 3] = 0;
                                }
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) {
                    ctx.drawImage(stagL1, 0, 0, w, h);
                }
            }

            // 3. StagLayer2 (Draw As-Is)
            const stagL2 = document.getElementById('stag-layer2');
            if (stagL2) {
                ctx.drawImage(stagL2, 0, 0, w, h);
            }

        } else if (frameId === '4') {
            // FRAME 4: Chronicles (3 Layers: Photos + ChronLayer1 + ChronLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. ChronLayer1 (Remove White)
            const chronL1 = document.getElementById('chron-layer1');
            if (chronL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');

                tCtx.drawImage(chronL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    
                    const padding = 100;
                    const slotH = (h - (padding * (count + 1))) / count;

                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                                    data[i + 3] = 0;
                                }
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) {
                    ctx.drawImage(chronL1, 0, 0, w, h);
                }
            }

            // 3. ChronLayer2 (Draw As-Is)
            const chronL2 = document.getElementById('chron-layer2');
            if (chronL2) {
                ctx.drawImage(chronL2, 0, 0, w, h);
            }

        } else {
            // ALL OTHER FRAMES (Standard Mode)
            
            // 1. Photos
            drawPhotos();

            // 2. Foreground Frame
            drawImageFit(currentFrameImg);
        }
    }

    downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `photobooth_${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
