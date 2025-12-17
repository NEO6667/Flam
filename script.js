// Canvas Setup
const canvas = document.getElementById('bezierCanvas');
const ctx = canvas.getContext('2d');
const fpsElement = document.getElementById('fps');

// Control Points Definition
const controlPoints = [
    { x: 0, y: 0, vx: 0, vy: 0 }, // P0 - fixed
    { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 }, // P1 - dynamic
    { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 }, // P2 - dynamic
    { x: 0, y: 0, vx: 0, vy: 0 }  // P3 - fixed
];

// Physics Parameters
let k = 0.1;
let damping = 0.92;
let mouseInfluence = 1.0;

let showTangents = true;
let showControlLines = true;
let showControlPoints = true;

let mouseX = 0;
let mouseY = 0;
let isMouseOverCanvas = false;

let lastTime = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    initControlPoints();
}

function initControlPoints() {
    const width = canvas.width;
    const height = canvas.height;
    
    // Fixed endpoints
    controlPoints[0].x = width * 0.1;
    controlPoints[0].y = height * 0.5;
    
    controlPoints[3].x = width * 0.9;
    controlPoints[3].y = height * 0.5;
    
    // Dynamic control points (initial positions)
    controlPoints[1].x = width * 0.3;
    controlPoints[1].y = height * 0.3;
    controlPoints[1].targetX = controlPoints[1].x;
    controlPoints[1].targetY = controlPoints[1].y;
    
    controlPoints[2].x = width * 0.7;
    controlPoints[2].y = height * 0.7;
    controlPoints[2].targetX = controlPoints[2].x;
    controlPoints[2].targetY = controlPoints[2].y;
}

function setupEventListeners() {
    // Physics parameter sliders
    const springSlider = document.getElementById('springConstant');
    const dampingSlider = document.getElementById('damping');
    const influenceSlider = document.getElementById('mouseInfluence');
    const springValue = document.getElementById('springValue');
    const dampingValue = document.getElementById('dampingValue');
    const influenceValue = document.getElementById('influenceValue');
    
    springSlider.addEventListener('input', function() {
        k = parseFloat(this.value);
        springValue.textContent = k.toFixed(2);
    });
    
    dampingSlider.addEventListener('input', function() {
        damping = parseFloat(this.value);
        dampingValue.textContent = damping.toFixed(2);
    });
    
    influenceSlider.addEventListener('input', function() {
        mouseInfluence = parseFloat(this.value);
        influenceValue.textContent = mouseInfluence.toFixed(1);
    });
    
    // visualization toggles
    document.getElementById('toggleTangents').addEventListener('click', function() {
        showTangents = !showTangents;
        this.classList.toggle('active');
    });
    
    document.getElementById('toggleControlLines').addEventListener('click', function() {
        showControlLines = !showControlLines;
        this.classList.toggle('active');
    });
    
    document.getElementById('togglePoints').addEventListener('click', function() {
        showControlPoints = !showControlPoints;
        this.classList.toggle('active');
    });
    
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        isMouseOverCanvas = true;
        
        // Set target positions for dynamic control points
        const width = canvas.width;
        const normalizedX = mouseX / width;
        
        const influenceP1 = Math.max(0, 1 - normalizedX * 2) * mouseInfluence;
        const influenceP2 = Math.max(0, normalizedX * 2 - 1) * mouseInfluence;
        
        if (influenceP1 > 0) {
            controlPoints[1].targetX = mouseX;
            controlPoints[1].targetY = mouseY;
        }
        
        if (influenceP2 > 0) {
            controlPoints[2].targetX = mouseX;
            controlPoints[2].targetY = mouseY;
        }
    });
    
    canvas.addEventListener('mouseleave', function() {
        isMouseOverCanvas = false;
        
        //return to original positions
        controlPoints[1].targetX = canvas.width * 0.3;
        controlPoints[1].targetY = canvas.height * 0.3;
        controlPoints[2].targetX = canvas.width * 0.7;
        controlPoints[2].targetY = canvas.height * 0.7;
    });
    
    window.addEventListener('resize', resizeCanvas);
}


// Bezier Curve Math Functions
function cubicBezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const u2 = u * u;
    const u3 = u2 * u;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x;
    const y = u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y;
    
    return { x, y };
}

function bezierTangent(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const u2 = u * u;
    const t2 = t * t;
    
    const dx = 3 * u2 * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
    const dy = 3 * u2 * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);
    
    return { x: dx, y: dy };
}

function updatePhysics() {
    //physics to P1 and P2 only
    for (let i = 1; i <= 2; i++) {
        const point = controlPoints[i];
        
        // calculating spring force (acceleration)
        const ax = -k * (point.x - point.targetX) - damping * point.vx;
        const ay = -k * (point.y - point.targetY) - damping * point.vy;
        
        // update velocity
        point.vx += ax;
        point.vy += ay;
        
        // update position
        point.x += point.vx;
        point.y += point.vy;
        
        //boundary constraints
        const margin = 30;
        if (point.x < margin) {
            point.x = margin;
            point.vx *= -0.5;
        }
        if (point.x > canvas.width - margin) {
            point.x = canvas.width - margin;
            point.vx *= -0.5;
        }
        if (point.y < margin) {
            point.y = margin;
            point.vy *= -0.5;
        }
        if (point.y > canvas.height - margin) {
            point.y = canvas.height - margin;
            point.vy *= -0.5;
        }
    }
}


function drawControlPoints() {
    if (!showControlPoints) return;
    
    // drawing control points
    for (let i = 0; i < controlPoints.length; i++) {
        const point = controlPoints[i];
        
        
        let color;
        let radius = 8;
        
        if (i === 0 || i === 3) {
            color = '#f72585'; //fixed points
            radius = 7;
        } else if (i === 1) {
            color = '#4cc9f0'; //P1
        } else {
            color = '#7209b7'; //P2
        }
        
        //darwing points
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        //drawing outline
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        
        // Label points
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i}`, point.x, point.y - 20);
    }
}

function drawControlLines() {
    if (!showControlLines) return;
    
    //lines connecting control points
    ctx.beginPath();
    ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
    ctx.lineTo(controlPoints[1].x, controlPoints[1].y);
    ctx.moveTo(controlPoints[2].x, controlPoints[2].y);
    ctx.lineTo(controlPoints[3].x, controlPoints[3].y);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawBezierCurve() {
    //bezier curve by sampling at small intervals
    ctx.beginPath();
    const p0 = controlPoints[0];
    const p1 = controlPoints[1];
    const p2 = controlPoints[2];
    const p3 = controlPoints[3];
    
    //move to first point
    const firstPoint = cubicBezier(0, p0, p1, p2, p3);
    ctx.moveTo(firstPoint.x, firstPoint.y);
    
    //sample curve
    for (let t = 0.01; t <= 1; t += 0.01) {
        const point = cubicBezier(t, p0, p1, p2, p3);
        ctx.lineTo(point.x, point.y);
    }
    
    //curve
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    //vurve glow effect
    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawTangents() {
    if (!showTangents) return;
    
    const p0 = controlPoints[0];
    const p1 = controlPoints[1];
    const p2 = controlPoints[2];
    const p3 = controlPoints[3];
    
    //tangent points
    const tangentPoints = [0, 0.2, 0.4, 0.6, 0.8, 1];
    
    for (const t of tangentPoints) {
        //calculating point on curve
        const point = cubicBezier(t, p0, p1, p2, p3);
        
        //calculating tangent vector
        const tangent = bezierTangent(t, p0, p1, p2, p3);
        
        //normalize tangent
        const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
        if (length === 0) continue;
        
        const scale = 108; //tang len
        const nx = tangent.x / length;
        const ny = tangent.y / length;
        
        //tangent line
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + nx * scale, point.y + ny * scale);
        ctx.strokeStyle = '#4361ee';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        //small circle at tangent point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4361ee';
        ctx.fill();
        
        //draw arrowhead
        ctx.beginPath();
        const arrowSize = 8;
        const arrowX = point.x + nx * scale;
        const arrowY = point.y + ny * scale;
        
        //perpendicular for arrow wings
        const perpX = -ny;
        const perpY = nx;
        
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - nx * arrowSize + perpX * arrowSize/2, 
                  arrowY - ny * arrowSize + perpY * arrowSize/2);
        ctx.lineTo(arrowX - nx * arrowSize - perpX * arrowSize/2, 
                  arrowY - ny * arrowSize - perpY * arrowSize/2);
        ctx.closePath();
        ctx.fillStyle = '#4361ee';
        ctx.fill();
    }
}

function drawMouseInfluence() {
    if (!isMouseOverCanvas) return;
    
    // mouse influence area
    const width = canvas.width;
    const normalizedX = mouseX / width;
    
    // P1(left side)
    const influenceP1 = Math.max(0, 1 - normalizedX * 2);
    if (influenceP1 > 0) {
        ctx.beginPath();
        ctx.arc(controlPoints[1].targetX, controlPoints[1].targetY, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(76, 201, 240, ${0.3 * influenceP1})`;
        ctx.fill();
    }
    
    // P2(right side)
    const influenceP2 = Math.max(0, normalizedX * 2 - 1);
    if (influenceP2 > 0) {
        ctx.beginPath();
        ctx.arc(controlPoints[2].targetX, controlPoints[2].targetY, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(114, 9, 183, ${0.3 * influenceP2})`;
        ctx.fill();
    }
    
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function animate(timestamp) {
    // time delta for consistent physics
    const deltaTime = timestamp - lastTime || 0;
    lastTime = timestamp;
    
    // update FPS per sec
    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        fpsElement.textContent = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f1525');
    gradient.addColorStop(1, '#0a0e18');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updatePhysics();
    
    drawControlLines();
    drawBezierCurve();
    drawTangents();
    drawControlPoints();
    drawMouseInfluence();
    

    requestAnimationFrame(animate);
}

function init() {
    resizeCanvas();
    setupEventListeners();
    requestAnimationFrame(animate);
}

window.addEventListener('load', init);