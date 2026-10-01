import React, { useRef, useEffect } from 'react';

export default function CarVisualization({
  throttle = 0,         // -100 to +100
  steering = 0,         // -100 to +100
  headlights = false,   // boolean
  horn = false,         // boolean
  mist = false,         // boolean
  speedKmh = 0,         // km/h
  isBraking = false,
  gear = 'D'
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const simRef = useRef({
    roadOffset: 0,
    carHeading: 0,      // smoothly tracks steering direction (yaw)
    wheelPivot: 0,      // front wheel steering angle
    bodyRoll: 0,        // subtle body roll during turns
    suspensionPitch: 0, // front dive on brake, rear squat on throttle
    wheelSpin: 0,       // rotational wheel spin
    mistParticles: [],
    speedDashes: [],
    hornWave: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Initialize multi-layered environmental speed particles
    const dashes = [];
    for (let i = 0; i < 48; i++) {
      dashes.push({
        x: Math.random() * 480 - 240,
        y: Math.random() * 600 - 300,
        length: 12 + Math.random() * 24,
        speed: 0.8 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.35,
        width: Math.random() > 0.8 ? 1.8 : 1.0,
        cyan: Math.random() > 0.4
      });
    }
    simRef.current.speedDashes = dashes;

    let lastTime = performance.now();

    const render = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const sim = simRef.current;

      // Handle Crisp High-DPI Canvas Scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.round(rect.width || 460);
      const displayHeight = Math.round(rect.height || 340);

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // ---------------------------------------------------------
      // 1. VEHICLE DYNAMICS PHYSICS CALCULATIONS
      // ---------------------------------------------------------
      const velocity = speedKmh;
      const roadSpeed = (velocity / 3.6) * 16; // pixels per second

      // Body Heading (Yaw): max ~24 degrees body turn
      const targetHeading = (steering / 100) * 22;
      sim.carHeading += (targetHeading - sim.carHeading) * Math.min(1, dt * 8.5);

      // Front Wheel Steering Pivot (-28° to +28°)
      const targetPivot = (steering / 100) * 28;
      sim.wheelPivot += (targetPivot - sim.wheelPivot) * Math.min(1, dt * 14);

      // Body Roll (chassis lean towards outside of turn)
      const targetRoll = -(steering / 100) * 2.2;
      sim.bodyRoll += (targetRoll - sim.bodyRoll) * Math.min(1, dt * 9);

      // Suspension Pitch:
      // - Brake / Reverse: Nose dives forward (-2.5px)
      // - Hard Acceleration: Rear squats (+2.0px)
      let targetPitch = 0;
      if (isBraking || (throttle < 0 && gear !== 'R')) {
        targetPitch = -2.8;
      } else if (throttle > 15) {
        targetPitch = (throttle / 100) * 2.2;
      }
      sim.suspensionPitch += (targetPitch - sim.suspensionPitch) * Math.min(1, dt * 10);

      // Ground travel & wheel spin
      sim.roadOffset = (sim.roadOffset + roadSpeed * dt) % 80;
      sim.wheelSpin += roadSpeed * dt * 0.22;

      // Horn sonic wave cycle
      if (horn) {
        sim.hornWave = (sim.hornWave + dt * 2.5) % 1.0;
      } else {
        sim.hornWave = 0;
      }

      // Clear Canvas with rich dark titanium gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, Math.max(centerX, centerY));
      bgGrad.addColorStop(0, '#0a0d14');
      bgGrad.addColorStop(0.6, '#07090d');
      bgGrad.addColorStop(1, '#040508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // ---------------------------------------------------------
      // 2. DIGITAL ENVIRONMENT (Ground Plane, Grid, Compass HUD)
      // ---------------------------------------------------------
      ctx.save();
      ctx.translate(centerX, centerY);

      // A. Ground Radial Spotlight / Halo under Car
      const groundGlow = ctx.createRadialGradient(0, 0, 20, 0, 0, 190);
      groundGlow.addColorStop(0, 'rgba(0, 216, 246, 0.07)');
      groundGlow.addColorStop(0.4, 'rgba(0, 216, 246, 0.02)');
      groundGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 190, 0, Math.PI * 2);
      ctx.fill();

      // B. Subtle Road Flow Lines / Track Borders
      const roadHalfWidth = 120;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([16, 20]);
      ctx.lineDashOffset = -sim.roadOffset;

      // Outer track boundaries
      ctx.beginPath();
      ctx.moveTo(-roadHalfWidth, -centerY);
      ctx.lineTo(-roadHalfWidth, centerY);
      ctx.moveTo(roadHalfWidth, -centerY);
      ctx.lineTo(roadHalfWidth, centerY);
      ctx.stroke();

      // Inner faint lane guidance lines
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 32]);
      ctx.lineDashOffset = -sim.roadOffset * 0.8;
      ctx.beginPath();
      ctx.moveTo(-60, -centerY);
      ctx.lineTo(-60, centerY);
      ctx.moveTo(60, -centerY);
      ctx.lineTo(60, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // C. Direction Compass / Radar Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.stroke();

      // Compass Major Ticks (N, NE, E, SE, S, SW, W, NW)
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const isCardinal = i % 3 === 0;
        const r1 = isCardinal ? 142 : 146;
        const r2 = 152;
        ctx.strokeStyle = isCardinal ? 'rgba(0, 216, 246, 0.28)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = isCardinal ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
        ctx.stroke();
      }

      // Dynamic Steering Angle Arc on Compass
      const headingRad = (sim.carHeading * Math.PI) / 180;
      if (Math.abs(steering) > 1) {
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          150,
          -Math.PI / 2,
          -Math.PI / 2 + headingRad,
          headingRad < 0
        );
        ctx.stroke();

        // Glowing cursor bead on compass ring
        const beadX = Math.sin(headingRad) * 150;
        const beadY = -Math.cos(headingRad) * 150;
        ctx.fillStyle = '#00d8f6';
        ctx.shadowColor = '#00d8f6';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(beadX, beadY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // D. Ground Speed Particles & Streaks
      if (Math.abs(velocity) > 1.5) {
        const speedRatio = Math.min(3, Math.abs(velocity) / 35);
        sim.speedDashes.forEach((dash) => {
          dash.y += roadSpeed * dt * dash.speed;
          if (dash.y > centerY + 40) dash.y = -centerY - Math.random() * 30;
          if (dash.y < -centerY - 40) dash.y = centerY + Math.random() * 30;

          const dashLen = dash.length * (0.6 + speedRatio * 0.9);
          ctx.strokeStyle = dash.cyan
            ? `rgba(0, 216, 246, ${dash.alpha * 0.7})`
            : `rgba(255, 255, 255, ${dash.alpha * 0.4})`;
          ctx.lineWidth = dash.width;
          ctx.beginPath();
          ctx.moveTo(dash.x, dash.y);
          ctx.lineTo(dash.x, dash.y + dashLen);
          ctx.stroke();
        });
      }

      ctx.restore();

      // ---------------------------------------------------------
      // 3. CAR HERO VISUALIZATION (ROTATED TO CAR HEADING)
      // ---------------------------------------------------------
      ctx.save();
      ctx.translate(centerX, centerY + sim.suspensionPitch);
      ctx.rotate((sim.carHeading * Math.PI) / 180);

      // A. VOLUMETRIC PROJECTOR HEADLIGHTS (When headlights are ON)
      if (headlights) {
        // Left Forward Projector Beam
        const leftBeam = ctx.createRadialGradient(-28, -78, 6, -55, -280, 210);
        leftBeam.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        leftBeam.addColorStop(0.15, 'rgba(0, 216, 246, 0.45)');
        leftBeam.addColorStop(0.65, 'rgba(0, 216, 246, 0.12)');
        leftBeam.addColorStop(1, 'transparent');
        ctx.fillStyle = leftBeam;
        ctx.beginPath();
        ctx.moveTo(-28, -75);
        ctx.lineTo(-135, -290);
        ctx.lineTo(-10, -290);
        ctx.closePath();
        ctx.fill();

        // Right Forward Projector Beam
        const rightBeam = ctx.createRadialGradient(28, -78, 6, 55, -280, 210);
        rightBeam.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        rightBeam.addColorStop(0.15, 'rgba(0, 216, 246, 0.45)');
        rightBeam.addColorStop(0.65, 'rgba(0, 216, 246, 0.12)');
        rightBeam.addColorStop(1, 'transparent');
        ctx.fillStyle = rightBeam;
        ctx.beginPath();
        ctx.moveTo(28, -75);
        ctx.lineTo(10, -290);
        ctx.lineTo(135, -290);
        ctx.closePath();
        ctx.fill();

        // Ground illumination puddle ahead of bumper
        const groundPuddle = ctx.createRadialGradient(0, -140, 20, 0, -140, 140);
        groundPuddle.addColorStop(0, 'rgba(0, 216, 246, 0.14)');
        groundPuddle.addColorStop(0.6, 'rgba(0, 216, 246, 0.04)');
        groundPuddle.addColorStop(1, 'transparent');
        ctx.fillStyle = groundPuddle;
        ctx.beginPath();
        ctx.ellipse(0, -140, 95, 75, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // B. REAR BRAKE / REVERSE GROUND ILLUMINATION
      const isReverse = gear === 'R' || throttle < -5;
      const isBrakingActive = isBraking || (throttle < 0 && gear !== 'R');

      if (isBrakingActive) {
        // Ruby Red Ground Reflection Bloom
        const brakeBloom = ctx.createRadialGradient(0, 96, 10, 0, 120, 110);
        brakeBloom.addColorStop(0, 'rgba(244, 63, 94, 0.42)');
        brakeBloom.addColorStop(0.5, 'rgba(244, 63, 94, 0.15)');
        brakeBloom.addColorStop(1, 'transparent');
        ctx.fillStyle = brakeBloom;
        ctx.beginPath();
        ctx.ellipse(0, 110, 85, 45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (isReverse) {
        // Bright Cool White Reverse Lamp Ground Pool
        const revBloom = ctx.createRadialGradient(0, 90, 8, 0, 110, 80);
        revBloom.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        revBloom.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        revBloom.addColorStop(1, 'transparent');
        ctx.fillStyle = revBloom;
        ctx.beginPath();
        ctx.ellipse(0, 105, 60, 35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. THEME ACCENT UNDERGLOW (Subtle neon ground reflection under rocker panels)
      const underglowGrad = ctx.createRadialGradient(0, 6, 24, 0, 6, 85);
      underglowGrad.addColorStop(0, 'rgba(0, 216, 246, 0.16)');
      underglowGrad.addColorStop(0.6, 'rgba(0, 216, 246, 0.05)');
      underglowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = underglowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 6, 52, 90, 0, 0, Math.PI * 2);
      ctx.fill();

      // D. MULTI-LAYER REALISTIC VEHICLE CONTACT SHADOW
      // Layer 1: Soft diffuse chassis shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 54, 94, 0, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: Tight dark ambient occlusion contact shadow directly under body
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 46, 82, 0, 0, Math.PI * 2);
      ctx.fill();

      // Contact shadows directly under tires
      const drawTireShadow = (tx, ty) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.beginPath();
        ctx.ellipse(tx, ty + 1, 9, 19, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      drawTireShadow(-39, -46);
      drawTireShadow(39, -46);
      drawTireShadow(-41, 48);
      drawTireShadow(41, 48);

      // E. FOUR WHEELS WITH STEERING PIVOT, BRAKE ROTORS & CALIPERS
      const drawWheel = (x, y, isFront, steerAngle) => {
        ctx.save();
        ctx.translate(x, y);

        // Front wheels pivot realistically with steering!
        if (isFront) {
          ctx.rotate((steerAngle * Math.PI) / 180);
        }

        // Tire Outer Rubber with 3D bevel
        const tireGrad = ctx.createLinearGradient(-7, 0, 7, 0);
        tireGrad.addColorStop(0, '#0a0d13');
        tireGrad.addColorStop(0.25, '#191f2c');
        tireGrad.addColorStop(0.75, '#191f2c');
        tireGrad.addColorStop(1, '#0a0d13');
        ctx.fillStyle = tireGrad;
        ctx.strokeStyle = '#252d3d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-7, -18, 14, 36, 4);
        ctx.fill();
        ctx.stroke();

        // Tire Tread Grooves (Smoothly cycling with wheelSpin)
        ctx.strokeStyle = '#0d1118';
        ctx.lineWidth = 1.4;
        const treadY = (sim.wheelSpin * 16) % 7;
        for (let ty = -14 + treadY; ty < 14; ty += 7) {
          ctx.beginPath();
          ctx.moveTo(-6, ty);
          ctx.lineTo(6, ty);
          ctx.stroke();
        }

        // Drilled Carbon-Ceramic Brake Rotor Disc
        const rotorGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
        rotorGrad.addColorStop(0, '#4a5568');
        rotorGrad.addColorStop(0.8, '#2d3748');
        rotorGrad.addColorStop(1, '#1a202c');
        ctx.fillStyle = rotorGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // High-Performance Electric Cyan Brake Caliper
        ctx.fillStyle = '#00d8f6';
        ctx.beginPath();
        ctx.roundRect(-4.5, -7, 4.5, 9, 1.5);
        ctx.fill();

        // Multi-Spoke Titanium Alloy Rim
        ctx.strokeStyle = '#8a99ad';
        ctx.lineWidth = 1.2;
        for (let s = 0; s < 5; s++) {
          const spAngle = (s * Math.PI * 2) / 5 + sim.wheelSpin * 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(spAngle) * 7.5, Math.sin(spAngle) * 7.5);
          ctx.stroke();
        }

        // Rim Outer Polished Lip
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        // Anodized Center Hub Nut
        ctx.fillStyle = '#00d8f6';
        ctx.shadowColor = '#00d8f6';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      };

      // Render front wheels (Steerable)
      drawWheel(-39, -46, true, sim.wheelPivot);
      drawWheel(39, -46, true, sim.wheelPivot);

      // Render rear wheels (Fixed)
      drawWheel(-41, 48, false, 0);
      drawWheel(41, 48, false, 0);

      // ---------------------------------------------------------
      // F. LAMBORGHINI SUPERCAR CHASSIS (Detailed Vector Sculpt)
      // ---------------------------------------------------------
      ctx.save();
      // Apply subtle body roll
      ctx.rotate((sim.bodyRoll * Math.PI) / 180);

      // 1. CARBON FIBER AERODYNAMIC UNDERBODY & SPLITTERS
      ctx.beginPath();
      // Front carbon splitter
      ctx.moveTo(0, -92);       // Sharp central aero fang
      ctx.lineTo(-24, -86);
      ctx.lineTo(-37, -81);     // Left front aero canard winglet
      ctx.lineTo(-39, -68);     // Front wheel arch relief
      ctx.lineTo(-44, -46);
      ctx.lineTo(-38, -26);     // Side skirt intake channel
      ctx.lineTo(-37, 24);      // Sculpted carbon rocker panel
      ctx.lineTo(-44, 46);      // Rear wheel arch flare
      ctx.lineTo(-44, 68);
      ctx.lineTo(-38, 86);      // Rear aero winglet
      ctx.lineTo(-26, 92);      // Diffuser corner
      ctx.lineTo(0, 93);        // Rear center undertray
      ctx.lineTo(26, 92);
      ctx.lineTo(38, 86);
      ctx.lineTo(44, 68);
      ctx.lineTo(44, 46);
      ctx.lineTo(37, 24);
      ctx.lineTo(38, -26);
      ctx.lineTo(44, -46);
      ctx.lineTo(39, -68);
      ctx.lineTo(37, -81);
      ctx.lineTo(24, -86);
      ctx.closePath();

      // Deep Matte Carbon Undertray
      ctx.fillStyle = '#07090e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. MAIN SCULPTED BODY SHELL (Metallic Obsidian Titanium Finish)
      ctx.beginPath();
      ctx.moveTo(0, -88);       // Nose apex (Lamborghini wedge)
      ctx.lineTo(-18, -82);     // Front left nose contour
      ctx.lineTo(-28, -72);     // Headlight corner
      ctx.lineTo(-35, -54);     // Front muscular fender peak
      ctx.lineTo(-36, -34);     // Fender drop
      ctx.lineTo(-30, -18);     // Waist intake tuck
      ctx.lineTo(-28, 12);      // Door panel recess
      ctx.lineTo(-39, 36);      // Muscular rear haunch intake scoop
      ctx.lineTo(-41, 56);      // Wide rear shoulder
      ctx.lineTo(-36, 76);      // Rear quarter endplate
      ctx.lineTo(-26, 85);      // Rear bumper corner
      ctx.lineTo(-12, 88);      // Rear diffuser flange
      ctx.lineTo(0, 89);        // Tail center
      ctx.lineTo(12, 88);
      ctx.lineTo(26, 85);
      ctx.lineTo(36, 76);
      ctx.lineTo(41, 56);
      ctx.lineTo(39, 36);
      ctx.lineTo(28, 12);
      ctx.lineTo(30, -18);
      ctx.lineTo(36, -34);
      ctx.lineTo(35, -54);
      ctx.lineTo(28, -72);
      ctx.lineTo(18, -82);
      ctx.closePath();

      // Multi-stop metallic titanium gradient
      const bodyGrad = ctx.createLinearGradient(-42, 0, 42, 0);
      bodyGrad.addColorStop(0, '#0c1017');
      bodyGrad.addColorStop(0.2, '#18212e');
      bodyGrad.addColorStop(0.5, '#222d3d');
      bodyGrad.addColorStop(0.8, '#18212e');
      bodyGrad.addColorStop(1, '#0c1017');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Electric Cyan Primary Accent Edge Chamfer
      ctx.strokeStyle = '#00d8f6';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // 3. FRONT HOOD & AERODYNAMIC AIR EXTRACTORS (Y-GEOMETRY)
      // Center hood spine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -86);
      ctx.lineTo(0, -42);
      ctx.stroke();

      // Dual sculpted hood vents (Aero S-Duct extractors)
      const drawHoodVent = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.fillStyle = '#07090e';
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.4)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(sign * 6, -70);
        ctx.lineTo(sign * 18, -60);
        ctx.lineTo(sign * 15, -45);
        ctx.lineTo(sign * 5, -48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vent grille louvers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sign * 8, -64);
        ctx.lineTo(sign * 16, -56);
        ctx.moveTo(sign * 7, -56);
        ctx.lineTo(sign * 15, -50);
        ctx.stroke();
      };
      drawHoodVent(true);
      drawHoodVent(false);

      // Lamborghini Front Hood Crest Badge (Gold / Yellow Hex Shield)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, -80);
      ctx.lineTo(-2.5, -77);
      ctx.lineTo(-1.8, -73);
      ctx.lineTo(0, -71);
      ctx.lineTo(1.8, -73);
      ctx.lineTo(2.5, -77);
      ctx.closePath();
      ctx.fill();

      // 4. SCULPTED SIDE INTERCOOLER / RADIATOR AIR INTAKES
      const drawSideIntake = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.fillStyle = '#06080d';
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sign * 28, -4);
        ctx.lineTo(sign * 37, 18);
        ctx.lineTo(sign * 37, 34);
        ctx.lineTo(sign * 26, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mesh pattern lines inside scoop
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.18)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sign * 30, 8);
        ctx.lineTo(sign * 36, 24);
        ctx.moveTo(sign * 28, 18);
        ctx.lineTo(sign * 34, 30);
        ctx.stroke();
      };
      drawSideIntake(true);
      drawSideIntake(false);

      // 5. COCKPIT CANOPY (Dark Tinted Glass + Realistic Specular Sheen)
      // Windshield & Roof Frame
      const glassGrad = ctx.createLinearGradient(0, -40, 0, 30);
      glassGrad.addColorStop(0, 'rgba(18, 26, 38, 0.96)');
      glassGrad.addColorStop(0.35, 'rgba(8, 12, 18, 0.98)');
      glassGrad.addColorStop(0.7, 'rgba(12, 18, 26, 0.98)');
      glassGrad.addColorStop(1, 'rgba(6, 9, 14, 0.98)');

      ctx.beginPath();
      ctx.moveTo(0, -38);       // Windshield front peak
      ctx.lineTo(-17, -26);     // A-pillar base
      ctx.lineTo(-20, 14);      // B-pillar curve
      ctx.lineTo(-16, 30);      // C-pillar rear glass
      ctx.lineTo(0, 32);        // Rear window center
      ctx.lineTo(16, 30);
      ctx.lineTo(20, 14);
      ctx.lineTo(17, -26);
      ctx.closePath();
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.45)';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Diagonal Specular Reflection across windshield
      const sheenGrad = ctx.createLinearGradient(-18, -36, 16, -10);
      sheenGrad.addColorStop(0, 'transparent');
      sheenGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.16)');
      sheenGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.08)');
      sheenGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.moveTo(-14, -34);
      ctx.lineTo(12, -18);
      ctx.lineTo(8, -12);
      ctx.lineTo(-16, -26);
      ctx.closePath();
      ctx.fill();

      // Gloss Carbon Center Roof Rib & Cockpit Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 24);
      ctx.stroke();

      // Sleek Carbon Aero Side Mirrors
      const drawMirror = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 26, -24);
        // Stalk
        ctx.strokeStyle = '#0e131c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sign * 8, -4);
        ctx.stroke();
        // Mirror housing
        ctx.fillStyle = '#161c28';
        ctx.strokeStyle = '#00d8f6';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(sign * 9, -5, 4.5, 2.5, sign * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mirror Glass Reflective Face
        ctx.fillStyle = '#38edff';
        ctx.beginPath();
        ctx.ellipse(sign * 9, -4.5, 3, 1.2, sign * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawMirror(true);
      drawMirror(false);

      // 6. REAR MID-ENGINE DECK & TITANIUM CROSS BRACE
      // Engine Bay Louvers (Slatted Glass / Hexagonal Hood Cover)
      ctx.fillStyle = '#080b11';
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.22)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-13, 34);
      ctx.lineTo(-16, 60);
      ctx.lineTo(0, 68);
      ctx.lineTo(16, 60);
      ctx.lineTo(13, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Titanium X-Brace over Engine Bay
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-11, 38);
      ctx.lineTo(11, 56);
      ctx.moveTo(11, 38);
      ctx.lineTo(-11, 56);
      ctx.stroke();

      // Engine Deck Cooling Slats
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      [42, 48, 54, 60].forEach((yPos) => {
        ctx.beginPath();
        ctx.moveTo(-10, yPos);
        ctx.lineTo(10, yPos);
        ctx.stroke();
      });

      // 7. HIGH-MOUNTED DUAL HEXAGONAL EXHAUST OUTLETS
      const drawExhaust = (xPos) => {
        // Hexagonal Exhaust Bezel
        ctx.fillStyle = '#0a0d14';
        ctx.strokeStyle = '#384252';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(xPos - 5, 75, 10, 6, 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Core Interior (Cyan Heat Discoloration / Pop on high throttle)
        const exhaustGlow = throttle > 60 ? '#38edff' : '#00d8f6';
        ctx.fillStyle = exhaustGlow;
        ctx.shadowColor = exhaustGlow;
        ctx.shadowBlur = throttle > 60 ? 8 : 3;
        ctx.beginPath();
        ctx.roundRect(xPos - 3, 76.5, 6, 3, 1);
        ctx.fill();
        ctx.shadowBlur = 0;
      };
      drawExhaust(-9);
      drawExhaust(9);

      // 8. ACTIVE AERODYNAMIC REAR CARBON WING (SVJ / Revuelto Style)
      ctx.fillStyle = '#0d121a';
      ctx.strokeStyle = '#00d8f6';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-38, 77);
      ctx.lineTo(-36, 83);
      ctx.lineTo(36, 83);
      ctx.lineTo(38, 77);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Aero Endplates
      ctx.fillStyle = '#00d8f6';
      ctx.fillRect(-39, 75, 2.5, 10);
      ctx.fillRect(36.5, 75, 2.5, 10);

      // 9. SIGNATURE Y-SHAPED FRONT HEADLIGHTS (DRLs & PROJECTORS)
      const drawHeadlight = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 25, -69);

        // Lamborghini Signature Y-Shaped LED DRL Ribbon
        const drlColor = headlights ? '#ffffff' : 'rgba(0, 216, 246, 0.85)';
        ctx.strokeStyle = drlColor;
        ctx.lineWidth = headlights ? 2.0 : 1.4;
        if (headlights) {
          ctx.shadowColor = '#00d8f6';
          ctx.shadowBlur = 10;
        }

        // Distinctive Y-shape pointing forward & inward
        ctx.beginPath();
        ctx.moveTo(sign * 4, -8);
        ctx.lineTo(0, 0);
        ctx.lineTo(sign * -3, 6);
        ctx.moveTo(0, 0);
        ctx.lineTo(sign * 5, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Projector Lens (Intense white bead when ON)
        if (headlights) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      };
      drawHeadlight(true);
      drawHeadlight(false);

      // 10. REAR TAILLIGHTS (SIGNATURE Y-LEDs / BRAKE / REVERSE)
      const drawRearTaillight = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 22, 85);

        if (isBrakingActive) {
          // Intense Ruby Red Brake Glow + Bloom
          ctx.strokeStyle = '#ff1e4a';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = '#ff1e4a';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          // Horizontal Y-ribbon
          ctx.moveTo(sign * -12, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(sign * 10, -4);
          ctx.moveTo(0, 0);
          ctx.lineTo(sign * 10, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // Sleek Running LED Markers
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(sign * -12, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(sign * 10, -4);
          ctx.moveTo(0, 0);
          ctx.lineTo(sign * 10, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Reverse White LED segments
        if (isReverse) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(sign * -4, 1, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      };
      drawRearTaillight(true);
      drawRearTaillight(false);

      // Center high-mounted brake light (CHMSL)
      if (isBrakingActive) {
        ctx.fillStyle = '#ff1e4a';
        ctx.shadowColor = '#ff1e4a';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(-8, 73, 16, 2.5, 1);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 11. MIST AEROSOL PARTICLES (From Rear Diffuser)
      if (mist) {
        for (let i = 0; i < 3; i++) {
          const side = Math.random() < 0.5 ? -18 : 18;
          sim.mistParticles.push({
            x: side + (Math.random() * 6 - 3),
            y: 88,
            vx: (Math.random() * 12 - 6),
            vy: 35 + Math.random() * 35 + roadSpeed * 0.4,
            radius: 3.5,
            maxRadius: 26,
            alpha: 0.75,
            decay: 0.92
          });
        }
      }

      for (let i = sim.mistParticles.length - 1; i >= 0; i--) {
        const p = sim.mistParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += (p.maxRadius - p.radius) * dt * 2.8;
        p.alpha -= p.decay * dt;

        if (p.alpha <= 0.01) {
          sim.mistParticles.splice(i, 1);
          continue;
        }

        const mg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        mg.addColorStop(0, `rgba(200, 240, 255, ${p.alpha * 0.55})`);
        mg.addColorStop(0.5, `rgba(0, 216, 246, ${p.alpha * 0.25})`);
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // Restore car rotation & translation

      // ---------------------------------------------------------
      // 4. HORN ACOUSTIC SONIC SHOCKWAVES
      // ---------------------------------------------------------
      if (horn) {
        ctx.save();
        ctx.translate(centerX, centerY - 65);
        ctx.rotate((sim.carHeading * Math.PI) / 180);

        [0, 0.4].forEach((offset) => {
          const wavePhase = (sim.hornWave + offset) % 1.0;
          const waveRadius = 35 + wavePhase * 65;
          const waveAlpha = (1 - wavePhase) * 0.7;

          ctx.strokeStyle = `rgba(0, 216, 246, ${waveAlpha})`;
          ctx.lineWidth = 2.2 * (1 - wavePhase * 0.5);
          ctx.shadowColor = '#00d8f6';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, -Math.PI * 0.82, -Math.PI * 0.18);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });

        ctx.restore();
      }

      ctx.restore(); // Restore high-DPI scaling

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [throttle, steering, headlights, horn, mist, speedKmh, isBraking, gear]);

  const headingDeg = Math.round(steering * 0.28);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* TOP: Front Heading Tag */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(8px, 2vh, 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '2px',
          color: 'var(--text-dim)',
          pointerEvents: 'none'
        }}
      >
        <span style={{ color: 'var(--accent)', fontSize: '11px' }}>▲</span>
        <span>FRONT ORIENTATION</span>
      </div>

      {/* BOTTOM CENTER: Integrated Telemetry Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 'clamp(8px, 2vh, 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(12px, 3vw, 24px)',
          padding: '4px 18px',
          backgroundColor: 'rgba(7, 9, 13, 0.88)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '4px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none'
        }}
      >
        {/* Speed Readout */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1
            }}
          >
            {Math.abs(Math.round(speedKmh))}
          </span>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>
            KM/H
          </span>
        </div>

        {/* Transmission Gear */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          GEAR: <strong style={{ color: gear === 'R' ? 'var(--status-red)' : 'var(--accent)' }}>{gear}</strong>
        </div>

        {/* Steer Angle */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          STEER: <strong style={{ color: '#ffffff' }}>{headingDeg > 0 ? `+${headingDeg}°` : `${headingDeg}°`}</strong>
        </div>
      </div>
    </div>
  );
}
