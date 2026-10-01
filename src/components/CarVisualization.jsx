import React, { useRef, useEffect } from 'react';

export default function CarVisualization({
  throttle = 0,         // -100 to +100
  steering = 0,         // -100 to +100
  headlights = false,   // boolean
  horn = false,         // boolean
  mist = false,         // boolean
  speedKmh = 0,         // km/h
  isBraking = false,
  gear = 'D',
  isRotating360 = false,
  rotationAngle = 0,    // 0 to 360 degrees
  sunroof = { state: 'CLOSED', progress: 0 },
  telemetry = {
    batteryVoltage: 7.84,
    batteryPercent: 82,
    obstacleDistance: 48,
    obstacleDetected: false,
    safetyStop: false,
    lineSensors: { left: false, center: true, right: false }
  },
  emergencyStopActive = false
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
    hornWave: 0,
    pivotParticleOffset: 0
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
      sim.pivotParticleOffset = (sim.pivotParticleOffset + dt * 3.5) % (Math.PI * 2);

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
      groundGlow.addColorStop(0, isRotating360 ? 'rgba(0, 216, 246, 0.16)' : 'rgba(0, 216, 246, 0.07)');
      groundGlow.addColorStop(0.4, isRotating360 ? 'rgba(0, 216, 246, 0.05)' : 'rgba(0, 216, 246, 0.02)');
      groundGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 190, 0, Math.PI * 2);
      ctx.fill();

      // B. 360° PIVOT TRAJECTORY CIRCLE (When 360° pivot mode is active)
      if (isRotating360) {
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -sim.pivotParticleOffset * 20;
        ctx.beginPath();
        ctx.arc(0, 0, 115, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbiting glowing beads indicating clockwise rotation
        for (let b = 0; b < 4; b++) {
          const bAngle = sim.pivotParticleOffset + (b * Math.PI) / 2;
          const bx = Math.cos(bAngle) * 115;
          const by = Math.sin(bAngle) * 115;
          ctx.fillStyle = '#00d8f6';
          ctx.shadowColor = '#00d8f6';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // C. Subtle Road Flow Lines / Track Borders
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

      // D. Direction Compass / Radar Ring
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
      const headingRad = ((sim.carHeading + (isRotating360 ? rotationAngle : 0)) * Math.PI) / 180;
      if (Math.abs(steering) > 1 || isRotating360) {
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

      // Ground Speed Particles & Streaks
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
      // 3. CAR HERO VISUALIZATION (ROTATED TO CAR HEADING & 360 PIVOT)
      // ---------------------------------------------------------
      ctx.save();
      ctx.translate(centerX, centerY + sim.suspensionPitch);

      // Smooth combined heading: standard steer yaw + full 360 in-place pivot angle!
      const totalHeadingDeg = sim.carHeading + (isRotating360 ? rotationAngle : 0);
      ctx.rotate((totalHeadingDeg * Math.PI) / 180);

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
        const brakeBloom = ctx.createRadialGradient(0, 96, 10, 0, 120, 110);
        brakeBloom.addColorStop(0, 'rgba(244, 63, 94, 0.42)');
        brakeBloom.addColorStop(0.5, 'rgba(244, 63, 94, 0.15)');
        brakeBloom.addColorStop(1, 'transparent');
        ctx.fillStyle = brakeBloom;
        ctx.beginPath();
        ctx.ellipse(0, 110, 85, 45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (isReverse) {
        const revBloom = ctx.createRadialGradient(0, 90, 8, 0, 110, 80);
        revBloom.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        revBloom.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        revBloom.addColorStop(1, 'transparent');
        ctx.fillStyle = revBloom;
        ctx.beginPath();
        ctx.ellipse(0, 105, 60, 35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. THEME ACCENT UNDERGLOW
      const underglowGrad = ctx.createRadialGradient(0, 6, 24, 0, 6, 85);
      underglowGrad.addColorStop(0, isRotating360 ? 'rgba(0, 216, 246, 0.32)' : 'rgba(0, 216, 246, 0.16)');
      underglowGrad.addColorStop(0.6, isRotating360 ? 'rgba(0, 216, 246, 0.1)' : 'rgba(0, 216, 246, 0.05)');
      underglowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = underglowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 6, 52, 90, 0, 0, Math.PI * 2);
      ctx.fill();

      // D. VEHICLE CONTACT SHADOW
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 54, 94, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 46, 82, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tire Contact Shadows
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

      // E. FOUR INDEPENDENT WHEELS (WITH 360° PIVOT 4WD ROTATION DEMONSTRATION)
      const drawWheel = (x, y, isFront, steerAngle, isLeftWheel) => {
        ctx.save();
        ctx.translate(x, y);

        // During 360° pivot: wheels pivot tangentially to the circle to demonstrate in-place rotation!
        let effectiveSteer = steerAngle;
        let wheelSpinDir = 1;

        if (isRotating360) {
          // Tangential angle for in-place circular rotation
          effectiveSteer = isFront
            ? (isLeftWheel ? -24 : 24)
            : (isLeftWheel ? 24 : -24);
          // Left wheels drive forward, right wheels drive reverse (4WD differential pivot!)
          wheelSpinDir = isLeftWheel ? 1 : -1;
        }

        ctx.rotate((effectiveSteer * Math.PI) / 180);

        // Tire Outer Rubber
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

        // Tire Tread Grooves
        ctx.strokeStyle = '#0d1118';
        ctx.lineWidth = 1.4;
        const spinOffset = isRotating360 ? (sim.pivotParticleOffset * 8 * wheelSpinDir) : (sim.wheelSpin * 16);
        const treadY = spinOffset % 7;
        for (let ty = -14 + treadY; ty < 14; ty += 7) {
          ctx.beginPath();
          ctx.moveTo(-6, ty);
          ctx.lineTo(6, ty);
          ctx.stroke();
        }

        // Brake Rotor
        const rotorGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
        rotorGrad.addColorStop(0, '#4a5568');
        rotorGrad.addColorStop(0.8, '#2d3748');
        rotorGrad.addColorStop(1, '#1a202c');
        ctx.fillStyle = rotorGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Brake Caliper
        ctx.fillStyle = '#00d8f6';
        ctx.beginPath();
        ctx.roundRect(-4.5, -7, 4.5, 9, 1.5);
        ctx.fill();

        // Multi-Spoke Rim
        ctx.strokeStyle = '#8a99ad';
        ctx.lineWidth = 1.2;
        const rimAngleOffset = isRotating360 ? (sim.pivotParticleOffset * 3 * wheelSpinDir) : (sim.wheelSpin * 0.5);
        for (let s = 0; s < 5; s++) {
          const spAngle = (s * Math.PI * 2) / 5 + rimAngleOffset;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(spAngle) * 7.5, Math.sin(spAngle) * 7.5);
          ctx.stroke();
        }

        // Rim Lip
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        // Center Nut
        ctx.fillStyle = '#00d8f6';
        ctx.shadowColor = '#00d8f6';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      };

      // 4 Wheels: Front Left, Front Right, Rear Left, Rear Right
      drawWheel(-39, -46, true, sim.wheelPivot, true);
      drawWheel(39, -46, true, sim.wheelPivot, false);
      drawWheel(-41, 48, false, 0, true);
      drawWheel(41, 48, false, 0, false);

      // ---------------------------------------------------------
      // F. LAMBORGHINI SUPERCAR CHASSIS VECTOR SCULPT
      // ---------------------------------------------------------
      ctx.save();
      ctx.rotate((sim.bodyRoll * Math.PI) / 180);

      // 1. CARBON FIBER AERODYNAMIC UNDERBODY & SPLITTERS
      ctx.beginPath();
      ctx.moveTo(0, -92);
      ctx.lineTo(-24, -86);
      ctx.lineTo(-37, -81);
      ctx.lineTo(-39, -68);
      ctx.lineTo(-44, -46);
      ctx.lineTo(-38, -26);
      ctx.lineTo(-37, 24);
      ctx.lineTo(-44, 46);
      ctx.lineTo(-41, 68);
      ctx.lineTo(-36, 78);
      ctx.lineTo(-24, 88);
      ctx.lineTo(0, 92);
      ctx.lineTo(24, 88);
      ctx.lineTo(36, 78);
      ctx.lineTo(41, 68);
      ctx.lineTo(44, 46);
      ctx.lineTo(37, 24);
      ctx.lineTo(38, -26);
      ctx.lineTo(44, -46);
      ctx.lineTo(39, -68);
      ctx.lineTo(37, -81);
      ctx.lineTo(24, -86);
      ctx.closePath();
      ctx.fillStyle = '#05070a';
      ctx.fill();
      ctx.strokeStyle = '#00d8f6';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 2. MAIN SCULPTED CHASSIS BODY
      ctx.beginPath();
      ctx.moveTo(0, -89);
      ctx.lineTo(-18, -82);
      ctx.lineTo(-32, -76);
      ctx.lineTo(-34, -40);
      ctx.lineTo(-31, 0);
      ctx.lineTo(-34, 42);
      ctx.lineTo(-33, 72);
      ctx.lineTo(-18, 83);
      ctx.lineTo(0, 86);
      ctx.lineTo(18, 83);
      ctx.lineTo(33, 72);
      ctx.lineTo(34, 42);
      ctx.lineTo(31, 0);
      ctx.lineTo(34, -40);
      ctx.lineTo(32, -76);
      ctx.lineTo(18, -82);
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(-42, 0, 42, 0);
      bodyGrad.addColorStop(0, '#0c1017');
      bodyGrad.addColorStop(0.2, '#18212e');
      bodyGrad.addColorStop(0.5, '#222d3d');
      bodyGrad.addColorStop(0.8, '#18212e');
      bodyGrad.addColorStop(1, '#0c1017');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = '#00d8f6';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // 3. FRONT HOOD & AERODYNAMIC S-DUCTS
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -86);
      ctx.lineTo(0, -42);
      ctx.stroke();

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
      };
      drawHoodVent(true);
      drawHoodVent(false);

      // Gold Lambo Hex Badge
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

      // 4. FRONT TCRT5000 IR LINE SENSOR INDICATORS (Under Front Nose)
      const lineSensors = telemetry?.lineSensors || { left: false, center: true, right: false };
      const drawLineTrackerLed = (xPos, isDetecting) => {
        ctx.save();
        ctx.fillStyle = isDetecting ? '#00d8f6' : 'rgba(255, 255, 255, 0.15)';
        if (isDetecting) {
          ctx.shadowColor = '#00d8f6';
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(xPos, -89, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawLineTrackerLed(-10, lineSensors.left);
      drawLineTrackerLed(0, lineSensors.center);
      drawLineTrackerLed(10, lineSensors.right);

      // 5. SIDE AIR INTAKES
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
      };
      drawSideIntake(true);
      drawSideIntake(false);

      // 6. COCKPIT CANOPY & SUNROOF HATCH (REVEALS ARDUINO NANO BAY)
      const glassGrad = ctx.createLinearGradient(0, -40, 0, 30);
      glassGrad.addColorStop(0, 'rgba(18, 26, 38, 0.96)');
      glassGrad.addColorStop(0.35, 'rgba(8, 12, 18, 0.98)');
      glassGrad.addColorStop(0.7, 'rgba(12, 18, 26, 0.98)');
      glassGrad.addColorStop(1, 'rgba(6, 9, 14, 0.98)');

      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(-17, -26);
      ctx.lineTo(-20, 14);
      ctx.lineTo(-16, 30);
      ctx.lineTo(0, 32);
      ctx.lineTo(16, 30);
      ctx.lineTo(20, 14);
      ctx.lineTo(17, -26);
      ctx.closePath();
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.45)';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // SUNROOF MECHANISM (Access hatch for Arduino Nano)
      const isSunroofOpen = sunroof.state === 'OPEN' || sunroof.state === 'OPENING';
      const roofSlideOffset = isSunroofOpen ? 18 : 0;

      // Interior bay revealed when sunroof is open
      if (isSunroofOpen) {
        // Exposed Arduino Nano bay
        ctx.fillStyle = '#0a1017';
        ctx.strokeStyle = 'rgba(0, 216, 246, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-10, -18, 20, 22, 2);
        ctx.fill();
        ctx.stroke();

        // Arduino Nano Micro PCB Silhouette
        ctx.fillStyle = '#0d2838';
        ctx.fillRect(-8, -16, 16, 18);

        // ATmega328P Chip & LED indicator
        ctx.fillStyle = '#050a0f';
        ctx.fillRect(-4, -10, 8, 8);

        // Blinking Nano Power / Status LED
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(4, -13, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Sliding Sunroof Glass Panel
      ctx.save();
      ctx.translate(0, roofSlideOffset);
      ctx.fillStyle = isSunroofOpen ? 'rgba(0, 216, 246, 0.15)' : 'rgba(10, 16, 26, 0.95)';
      ctx.strokeStyle = 'rgba(0, 216, 246, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-11, -20, 22, 18, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Specular sheen across canopy
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

      // Side mirrors
      const drawMirror = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 26, -24);
        ctx.strokeStyle = '#0e131c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sign * 8, -4);
        ctx.stroke();
        ctx.fillStyle = '#161c28';
        ctx.strokeStyle = '#00d8f6';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(sign * 9, -5, 4.5, 2.5, sign * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      drawMirror(true);
      drawMirror(false);

      // 7. REAR ENGINE DECK & DUAL EXHAUST
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

      const drawExhaust = (xPos) => {
        ctx.fillStyle = '#0a0d14';
        ctx.strokeStyle = '#384252';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(xPos - 5, 75, 10, 6, 2);
        ctx.fill();
        ctx.stroke();

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

      // Rear Wing
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

      ctx.fillStyle = '#00d8f6';
      ctx.fillRect(-39, 75, 2.5, 10);
      ctx.fillRect(36.5, 75, 2.5, 10);

      // 8. SIGNATURE Y-HEADLIGHTS
      const drawHeadlight = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 25, -69);

        const drlColor = headlights ? '#ffffff' : 'rgba(0, 216, 246, 0.85)';
        ctx.strokeStyle = drlColor;
        ctx.lineWidth = headlights ? 2.0 : 1.4;
        if (headlights) {
          ctx.shadowColor = '#00d8f6';
          ctx.shadowBlur = 10;
        }

        ctx.beginPath();
        ctx.moveTo(sign * 4, -8);
        ctx.lineTo(0, 0);
        ctx.lineTo(sign * -3, 6);
        ctx.moveTo(0, 0);
        ctx.lineTo(sign * 5, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

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

      // 9. REAR TAILLIGHTS (Brake, Running, Reverse)
      const drawRearTaillight = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        ctx.save();
        ctx.translate(sign * 22, 85);

        if (isBrakingActive) {
          ctx.strokeStyle = '#ff1e4a';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = '#ff1e4a';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(sign * -12, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(sign * 10, -4);
          ctx.moveTo(0, 0);
          ctx.lineTo(sign * 10, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
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

      // 10. MIST AEROSOL PARTICLES
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

      // 11. ULTRASONIC COLLISION SONAR WARNING (Ahead of front bumper)
      const obstacleDist = telemetry?.obstacleDistance || 45;
      if (telemetry?.obstacleDetected || obstacleDist <= 25) {
        const isCritical = obstacleDist <= 12;
        const sonarColor = isCritical ? 'rgba(244, 63, 94, 0.85)' : 'rgba(245, 158, 11, 0.75)';

        for (let a = 1; a <= 3; a++) {
          ctx.strokeStyle = sonarColor;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = isCritical ? '#f43f5e' : '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, -90, 18 + a * 12, -Math.PI * 0.75, -Math.PI * 0.25);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore(); // Restore car transformation

      // ---------------------------------------------------------
      // 4. HORN ACOUSTIC SONIC SHOCKWAVES
      // ---------------------------------------------------------
      if (horn) {
        ctx.save();
        ctx.translate(centerX, centerY - 65);
        ctx.rotate((totalHeadingDeg * Math.PI) / 180);

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
  }, [
    throttle,
    steering,
    headlights,
    horn,
    mist,
    speedKmh,
    isBraking,
    gear,
    isRotating360,
    rotationAngle,
    sunroof,
    telemetry,
    emergencyStopActive
  ]);

  const headingDeg = Math.round(steering * 0.28);
  const isObstacle = telemetry?.obstacleDetected;
  const isSafetyStop = telemetry?.safetyStop;

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

      {/* TOP: Front Heading Tag & Proximity Sonar Warning */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(6px, 1.8vh, 14px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '2px',
          color: isSafetyStop
            ? 'var(--status-red)'
            : isObstacle
            ? 'var(--status-amber)'
            : 'var(--text-dim)',
          pointerEvents: 'none',
          backgroundColor: isSafetyStop ? 'rgba(244, 63, 94, 0.12)' : 'transparent',
          padding: '2px 8px',
          borderRadius: '4px'
        }}
      >
        <span style={{ color: isSafetyStop ? 'var(--status-red)' : 'var(--accent)', fontSize: '11px' }}>▲</span>
        <span>
          {isSafetyStop
            ? `PROXIMITY SAFETY STOP (${telemetry.obstacleDistance}cm)`
            : isObstacle
            ? `OBSTACLE DETECTED (${telemetry.obstacleDistance}cm)`
            : isRotating360
            ? '360° DIFFERENTIAL PIVOT'
            : 'FRONT ORIENTATION'}
        </span>
      </div>

      {/* BOTTOM CENTER: Integrated Telemetry Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 'clamp(6px, 1.8vh, 14px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(10px, 2.5vw, 20px)',
          padding: '4px 16px',
          backgroundColor: 'rgba(7, 9, 13, 0.88)',
          border: `1px solid ${emergencyStopActive ? 'var(--status-red)' : 'var(--border-hairline)'}`,
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
              fontSize: 'clamp(18px, 3.8vw, 24px)',
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

        {/* Steer Angle or 360 Pivot Status */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          {isRotating360 ? (
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>360° PIVOT</span>
          ) : (
            <>STEER: <strong style={{ color: '#ffffff' }}>{headingDeg > 0 ? `+${headingDeg}°` : `${headingDeg}°`}</strong></>
          )}
        </div>

        {/* Sonar Distance */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: isObstacle ? 'var(--status-amber)' : 'var(--text-dim)' }}>
          SONAR: {telemetry?.obstacleDistance || 45}cm
        </div>

        {/* Sunroof Badge */}
        {sunroof?.state !== 'CLOSED' && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)' }}>
            ROOF: {sunroof.state}
          </div>
        )}
      </div>
    </div>
  );
}
