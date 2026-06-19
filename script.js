 const video = document.getElementById('camera-view');
    const canvas = document.getElementById('final-canvas');
    const ctx = canvas.getContext('2d');
    const frameSidebar = document.getElementById('frame-sidebar');
    const startBtn = document.getElementById('start-btn');
    const downloadBtn = document.getElementById('download-btn');
    const flashEl = document.getElementById('flash');
    const guide = document.getElementById('camera-guide');
    const selectionScreen = document.getElementById('selection-screen');
    const selectionGrid = document.getElementById('selection-grid');
    const confirmSelectionBtn = document.getElementById('confirm-selection-btn');

    let capturedPhotos = [];
    let finalSelectedPhotos = [];
    let currentFilter = 'none';
    let currentFrameImg = document.querySelector('.frame-thumb.selected');

    // Init Camera
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = updateGuide;
        });

    window.addEventListener('resize', updateGuide);

    function updateGuide() {
        if (video.style.display === 'none') {
            guide.style.display = 'none';
            return;
        }
        const rect = video.getBoundingClientRect();
        if (rect.width === 0) return;

        const ratio = 0.923; // Slot Ratio (640/693.33) based on padding 80
        const vidRatio = rect.width / rect.height;
        
        let w, h;
        if (vidRatio > ratio) {
            h = rect.height;
            w = h * ratio;
        } else {
            w = rect.width;
            h = w / ratio;
        }
        
        guide.style.width = `${w}px`;
        guide.style.height = `${h}px`;
        guide.style.display = 'block';
    }

    // Filter Logic
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            video.style.filter = currentFilter;
            if(finalSelectedPhotos.length > 0) renderFinal(finalSelectedPhotos);
        }
    });

    // Frame Selection Logic (Fixed: Re-renders the canvas with existing photos)
    document.querySelectorAll('.frame-thumb').forEach(img => {
        img.onclick = () => {
            document.querySelectorAll('.frame-thumb').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            currentFrameImg = img;
            if (finalSelectedPhotos.length > 0) {
                renderFinal(finalSelectedPhotos); // Apply new frame to existing images
            }
        }
    });

    // Take Shots Logic
    startBtn.onclick = () => {
        const targetCount = 6;

        // Initialize session if starting fresh
        if (capturedPhotos.length === 0) {
            video.style.display = 'block';
            canvas.style.display = 'none';
            updateGuide();
        }

        flash();
        snap();

        if (capturedPhotos.length < targetCount) {
            startBtn.innerText = `Take Photo (${capturedPhotos.length + 1}/${targetCount})`;
        } else {
            // All 6 shots taken, move to selection screen
            video.style.display = 'none';
            guide.style.display = 'none';
            startBtn.style.display = 'none';
            showSelectionScreen();
        }
    };

    function showSelectionScreen() {
        selectionGrid.innerHTML = ''; // Clear previous
        capturedPhotos.forEach((photoCanvas, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';

            const img = document.createElement('img');
            img.src = photoCanvas.toDataURL();
            img.classList.add('selection-thumb');
            img.dataset.index = index;
            
            const num = document.createElement('div');
            num.className = 'selection-number';
            num.innerText = index + 1;

            img.onclick = () => {
                const isSelected = img.classList.contains('selected');
                const selectedCount = document.querySelectorAll('.selection-thumb.selected').length;

                if (isSelected) {
                    img.classList.remove('selected');
                } else if (selectedCount < 3) {
                    img.classList.add('selected');
                }
            };
            wrapper.appendChild(img);
            wrapper.appendChild(num);
            selectionGrid.appendChild(wrapper);
        });
        selectionScreen.style.display = 'flex';
    }

    confirmSelectionBtn.onclick = () => {
        const selectedThumbs = document.querySelectorAll('.selection-thumb.selected');
        if (selectedThumbs.length !== 3) {
            alert('Please select exactly 3 photos.');
            return;
        }

        finalSelectedPhotos = Array.from(selectedThumbs).map(thumb => {
            const index = parseInt(thumb.dataset.index, 10);
            return capturedPhotos[index];
        });

        selectionScreen.style.display = 'none';
        canvas.style.display = 'block';
        frameSidebar.classList.add('unlocked');
        downloadBtn.style.display = 'inline-block';
        startBtn.innerText = "Restart";
        startBtn.style.display = 'inline-block';
        startBtn.onclick = () => location.reload();
        renderFinal(finalSelectedPhotos);
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

    function renderFinal(photosToRender) {
        if (!photosToRender || photosToRender.length === 0) return;

        const count = photosToRender.length;
        const w = 800;
        const h = (count === 3) ? 2400 : 3200; // Canvas height
        canvas.width = w;
        canvas.height = h;

        const frameId = currentFrameImg.dataset.id;

        // Draw Background
        ctx.filter = 'none';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Helper: Draw Photos
        const drawPhotos = () => {
            const padding = 80;
            const slotW = w - (padding * 2);
            const slotH = (h - (padding * (count + 1))) / count;

            photosToRender.forEach((imgCanvas, i) => {
                const yPos = padding + (i * (slotH + padding));
                
                // Aspect Ratio Crop Logic (Center Crop)
                const sRatio = imgCanvas.width / imgCanvas.height;
                const dRatio = slotW / slotH;
                let sx, sy, sWidth, sHeight;

                if (sRatio > dRatio) {
                    // Image is wider than slot: Crop width
                    sHeight = imgCanvas.height;
                    sWidth = imgCanvas.height * dRatio;
                    sx = (imgCanvas.width - sWidth) / 2;
                    sy = 0;
                } else {
                    // Image is taller than slot: Crop height
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

                // Draw Border
                ctx.beginPath();
                ctx.lineWidth = 10;

                if (frameId === '2') {
                    ctx.strokeStyle = '#234d71';
                    ctx.roundRect(padding, yPos, slotW, slotH, 30);
                    ctx.stroke();

                    // Outer Dashed White Border
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

        // Helper: Draw Image Fit
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

        // --- Frame Logic Switch ---
        if (frameId === '2') {
            // FRAME 2: Student Council (3 Layers: Photos + Middle + Top)
            
            // 1. Photos (Layer 1)
            drawPhotos();

            // 2. StudentCouncilLayer1 (Layer 2) - Remove White
            const scOverlay = document.getElementById('sc-overlay');
            if (scOverlay) {
                // Create a temp canvas to remove white background
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');

                // Draw overlay stretched to fit (ensures alignment)
                tCtx.drawImage(scOverlay, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    
                    // Define Photo Slots (Replicating drawPhotos logic)
                    const padding = 80;
                    const slotH = (h - (padding * (count + 1))) / count;
                    
                    // Iterate over each slot and clear white pixels specifically in that area
                    for (let k = 0; k < count; k++) {
                        const yStart = Math.floor(padding + (k * (slotH + padding)));
                        const yEnd = Math.floor(yStart + slotH);
                        const xStart = padding;
                        const xEnd = w - padding;
                        
                        // Process only the pixels within this slot's rectangle
                        for (let y = yStart; y < yEnd; y++) {
                            const rowStart = y * w * 4;
                            for (let x = xStart; x < xEnd; x++) {
                                const i = rowStart + (x * 4);
                                // If pixel is white, make it transparent
                                if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
                                    data[i + 3] = 0;
                                }
                            }
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                    ctx.drawImage(tempC, 0, 0);
                } catch (e) {
                    // Fallback
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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
                    const padding = 80;
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

        } else if (frameId === '18') {
            // FRAME 18: Stitch (3 Layers: Photos + StitchLayer1 + StitchLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. StitchLayer1 (Remove White)
            const stitchL1 = document.getElementById('stitch-layer1');
            if (stitchL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(stitchL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(stitchL1, 0, 0, w, h); }
            }

            // 3. StitchLayer2
            const stitchL2 = document.getElementById('stitch-layer2');
            if (stitchL2) {
                ctx.drawImage(stitchL2, 0, 0, w, h);
            }
        } else if (frameId === '20') {
            // FRAME 20: Min2 (3 Layers: Photos + Min2Layer1 + Min2Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min2Layer1 (Remove White)
            const min2L1 = document.getElementById('min2-layer1');
            if (min2L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min2L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min2L1, 0, 0, w, h); }
            }

            // 3. Min2Layer2
            const min2L2 = document.getElementById('min2-layer2');
            if (min2L2) {
                ctx.drawImage(min2L2, 0, 0, w, h);
            }
        } else if (frameId === '21') {
            // FRAME 21: Min3 (3 Layers: Photos + Min3Layer1 + Min3Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min3Layer1 (Remove White)
            const min3L1 = document.getElementById('min3-layer1');
            if (min3L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min3L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min3L1, 0, 0, w, h); }
            }

            // 3. Min3Layer2
            const min3L2 = document.getElementById('min3-layer2');
            if (min3L2) {
                ctx.drawImage(min3L2, 0, 0, w, h);
            }
        } else if (frameId === '22') {
            // FRAME 22: Min4 (3 Layers: Photos + Min4Layer1 + Min4Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min4Layer1 (Remove White)
            const min4L1 = document.getElementById('min4-layer1');
            if (min4L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min4L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min4L1, 0, 0, w, h); }
            }

            // 3. Min4Layer2
            const min4L2 = document.getElementById('min4-layer2');
            if (min4L2) {
                ctx.drawImage(min4L2, 0, 0, w, h);
            }
        } else if (frameId === '23') {
            // FRAME 23: Min5 (3 Layers: Photos + Min5Layer1 + Min5Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min5Layer1 (Remove White)
            const min5L1 = document.getElementById('min5-layer1');
            if (min5L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min5L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min5L1, 0, 0, w, h); }
            }

            // 3. Min5Layer2
            const min5L2 = document.getElementById('min5-layer2');
            if (min5L2) {
                ctx.drawImage(min5L2, 0, 0, w, h);
            }
        } else if (frameId === '24') {
            // FRAME 24: Min6 (3 Layers: Photos + Min6Layer1 + Min6Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min6Layer1 (Remove White)
            const min6L1 = document.getElementById('min6-layer1');
            if (min6L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min6L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min6L1, 0, 0, w, h); }
            }

            // 3. Min6Layer2
            const min6L2 = document.getElementById('min6-layer2');
            if (min6L2) {
                ctx.drawImage(min6L2, 0, 0, w, h);
            }
        } else if (frameId === '25') {
            // FRAME 25: Min7 (3 Layers: Photos + Min7Layer1 + Min7Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min7Layer1 (Remove White)
            const min7L1 = document.getElementById('min7-layer1');
            if (min7L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min7L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min7L1, 0, 0, w, h); }
            }

            // 3. Min7Layer2
            const min7L2 = document.getElementById('min7-layer2');
            if (min7L2) {
                ctx.drawImage(min7L2, 0, 0, w, h);
            }
        } else if (frameId === '26') {
            // FRAME 26: Min8 (3 Layers: Photos + Min8Layer1 + Min8Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min8Layer1 (Remove White)
            const min8L1 = document.getElementById('min8-layer1');
            if (min8L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min8L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min8L1, 0, 0, w, h); }
            }

            // 3. Min8Layer2
            const min8L2 = document.getElementById('min8-layer2');
            if (min8L2) {
                ctx.drawImage(min8L2, 0, 0, w, h);
            }
        } else if (frameId === '27') {
            // FRAME 27: Min9 (3 Layers: Photos + Min9Layer1 + Min9Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min9Layer1 (Remove White)
            const min9L1 = document.getElementById('min9-layer1');
            if (min9L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min9L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min9L1, 0, 0, w, h); }
            }

            // 3. Min9Layer2
            const min9L2 = document.getElementById('min9-layer2');
            if (min9L2) {
                ctx.drawImage(min9L2, 0, 0, w, h);
            }
        } else if (frameId === '28') {
            // FRAME 28: Liga (3 Layers: Photos + LigaLayer1 + LigaLayer2)
            
            // 1. Photos
            drawPhotos();

            // 2. LigaLayer1 (Remove White)
            const ligaL1 = document.getElementById('liga-layer1');
            if (ligaL1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(ligaL1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(ligaL1, 0, 0, w, h); }
            }

            // 3. LigaLayer2
            const ligaL2 = document.getElementById('liga-layer2');
            if (ligaL2) {
                ctx.drawImage(ligaL2, 0, 0, w, h);
            }
        } else if (frameId === '19') {
            // FRAME 19: Min1 (3 Layers: Photos + Min1Layer1 + Min1Layer2)
            
            // 1. Photos
            drawPhotos();

            // 2. Min1Layer1 (Remove White)
            const min1L1 = document.getElementById('min1-layer1');
            if (min1L1) {
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(min1L1, 0, 0, w, h);

                try {
                    const imgData = tCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    const padding = 80;
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
                } catch (e) { ctx.drawImage(min1L1, 0, 0, w, h); }
            }

            // 3. Min1Layer2
            const min1L2 = document.getElementById('min1-layer2');
            if (min1L2) {
                ctx.drawImage(min1L2, 0, 0, w, h);
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
                    const padding = 80;
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
                    
                    const padding = 80;
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
                    
                    const padding = 80;
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
        const printCanvas = document.createElement('canvas');
        const printCtx = printCanvas.getContext('2d');
        const gap = 3;

        // Create 2 copies side-by-side (Matches 102x152mm / 4x6" aspect ratio)
        printCanvas.width = (canvas.width * 2) + gap;
        printCanvas.height = canvas.height;

        printCtx.fillStyle = 'white';
        printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);

        printCtx.drawImage(canvas, 0, 0);
        printCtx.drawImage(canvas, canvas.width + gap, 0);

        const link = document.createElement('a');
        link.download = `photobooth_${Date.now()}.jpg`;
        link.href = printCanvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
