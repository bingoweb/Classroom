const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.pointerEvents = 'none';
canvas.style.zIndex = '9999';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 10 + 5;
        this.speed = Math.random() * 3 + 2;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        if (this.y > canvas.height) {
            this.y = -10;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

let animationId;
let isRunning = false;

function startConfetti() {
    if (isRunning) return;
    isRunning = true;
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
    }
    animate();
}

function stopConfetti() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function animate() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    animationId = requestAnimationFrame(animate);
}

// Expose globally
window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;
