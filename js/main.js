"use strict";

class Turtle {

	constructor(pos, dir, angle) {
		this.pos = pos;
		this.dir = dir;
		this.angle = angle;
	}

}

const renderer = new THREE.WebGLRenderer({ antialiasing: false, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000);
renderer.toneMapping = THREE.ReinhardToneMapping;
const exposureLow = Math.pow(1.05, 4.0);
const exposureHigh = Math.pow(1.5, 4.0);
renderer.toneMappingExposure = exposureLow;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const cameraFov = 60;
const cameraAspect = window.innerWidth / window.innerHeight;
const cameraNear = 1;
const cameraFar = 1000;

const camera = new THREE.PerspectiveCamera(cameraFov, cameraAspect, cameraNear, cameraFar);
let phi = 0;
let theta = 0;
resetCameraPosition();

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

let rotateStart = new THREE.Vector2(0,0);
let rotateEnd = new THREE.Vector2(0,0);
let rotateDelta = new THREE.Vector2(0,0);
let isDragging = false;
let MOUSE_SPEED_X = 0;
let MOUSE_SPEED_Y = 0;

window.addEventListener("mousedown", function(event) {
	rotateStart.set(event.clientX, event.clientY);
	isDragging = true;
	MOUSE_SPEED_X = 0.5;
	MOUSE_SPEED_Y = 0.3;
});

// Very similar to https://gist.github.com/mrflix/8351020
window.addEventListener("mousemove", function(event) {
	if (!isDragging && !isPointerLocked()) {
		return;
	}

	// Support pointer lock API.
	if (isPointerLocked()) {
		let movementX = event.movementX || event.mozMovementX || 0;
		let movementY = event.movementY || event.mozMovementY || 0;
		rotateEnd.set(rotateStart.x - movementX, rotateStart.y - movementY);
	} else {
		rotateEnd.set(event.clientX, event.clientY);
	}

	// Calculate how much we moved in mouse space.
	rotateDelta.subVectors(rotateEnd, rotateStart);
	rotateStart.copy(rotateEnd);

	// Keep track of the cumulative euler angles.
	let element = document.body;
	phi += 2 * Math.PI * rotateDelta.y / element.clientHeight * MOUSE_SPEED_Y;
	theta += 2 * Math.PI * rotateDelta.x / element.clientWidth * MOUSE_SPEED_X;

	// Prevent looking too far up or down.
	phi = util.clamp(phi, -Math.PI/2, Math.PI/2);

	let euler = new THREE.Euler(-phi, -theta, 0, 'YXZ');
	camera.quaternion.setFromEuler(euler);
});

window.addEventListener("mouseup", function(event) {
	isDragging = false;
	MOUSE_SPEED_X = 0;
	MOUSE_SPEED_Y = 0;
});

function isPointerLocked() {
	let el = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
	return el !== undefined;
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 
const clock = new THREE.Clock();

const scene = new THREE.Scene();
const fogColor = 0x000000;
const fogDensity = 0.00375;
scene.fog = new THREE.FogExp2(fogColor, fogDensity);
scene.background = new THREE.Color("#000000");  

const meshLineWidth = 0.6;
const meshLineOpacity = 0.1;
const meshLineResolution = 0.1;

function createMat(_color, _opacity, _lineWidth) {
    let mat = new MeshLineMaterial({
        //useMap: 1,
        //map: texture,
        transparent: false,
        color: _color,
        sizeAttenuation: true,
        opacity: _opacity, 
        lineWidth: _lineWidth,
        depthWrite: false,
        depthTest: false,
        resolution: new THREE.Vector2(meshLineResolution, meshLineResolution),
        blending: THREE.AdditiveBlending
        /*
        blending: THREE[blending],
        blendSrc: THREE[blendSrc[4]],
        blendDst: THREE[blendDst[1]],
        blendEquation: THREE.AddEquation
        */
    });

    return mat;
}

const mat1 = createMat(0xaaffff, meshLineOpacity, meshLineWidth);
const mat2 = createMat(0xffffaa, meshLineOpacity, meshLineWidth);
const mat3 = createMat(0xff1111, meshLineOpacity, meshLineWidth);

const globalScale = 50;
const globalOffset = new THREE.Vector3(-20, -60, -350); 
const globalSpeedFactor = 4;
const globalSpread = 7;

const axisX = new THREE.Vector3(1, 0, 0);
const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);

const triggerDistance = 35;

movingSpeedMax = 1.3;
movingDelta = 0.03;

// ~ ~ ~ 
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 3.5; //1.5;
bloomPass.radius = 0.8;

const renderPass = new THREE.RenderPass(scene, camera);

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);

function resetCameraPosition() {
	camera.position.set(0, 0, 0);
	camera.lookAt(0, 0, 0);
	phi = 0;
	theta = 0;
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~

let lexicon = "FfXxYyZz<>(.".split("");

let pop = [];
const pop_size = 25;
const mutability = 0.5;
const numCmds = 50;

function reset() {
	pop = [];
	for (let i=0; i<pop_size; i++) {
		pop.push(new Child());
	}

	setupPlayer();

	draw();
}

function turtledraw(t, cmds) {
	let lines = [];
	let now = clock.getElapsedTime() / globalSpeedFactor;
	let turtleStep = 0.5;

	for (let i=0; i<cmds.length; i++) {
		let cmd = cmds[i];
		
		if (cmd == "F") {
			// move forward, drawing a line:
			lines.push(t.pos.clone());  
			t.pos.add(t.dir); // move
			lines.push(t.pos.clone());
		} else if (cmd == "f") {
			// move forward, drawing a line:
			lines.push(t.pos.clone());  
			t.pos.add(t.dir.clone().multiplyScalar(turtleStep));//0.5)); // move
			lines.push(t.pos.clone());
		} else if (cmd == "X") {
			// rotate +x:
			t.dir.applyAxisAngle(axisX, t.angle * Math.sin(now));
		} else if (cmd == "x") {
			// rotate -x:
			t.dir.applyAxisAngle(axisX, -t.angle * Math.sin(now));
		} else if (cmd == "Y") {
			// rotate +y:
			t.dir.applyAxisAngle(axisY, t.angle * Math.sin(now));
		} else if (cmd == "y") {
			// rotate -y:
			t.dir.applyAxisAngle(axisY, -t.angle * Math.sin(now));
		} else if (cmd == "Z") {
			// rotate +z:
			t.dir.applyAxisAngle(axisZ, t.angle * Math.sin(now));
		} else if (cmd == "z") {
			// rotate -z:
			t.dir.applyAxisAngle(axisZ, -t.angle * Math.sin(now));
		} else if (cmd == "<") {
			t.angle *= 2;
		} else if (cmd == ">") {
			t.angle /= 2;
		} else if (cmd == "(") {
			// spawn a copy of the turtle:
			let t1 = new Turtle(t.pos.clone(), t.dir.clone(), -t.angle);

			let morelines = turtledraw(t1, cmds.slice(i+1));
			lines = lines.concat(morelines);
		}
	}

	return lines;
}

class Child {

	constructor() {
		this.cmds = this.createCmds(numCmds);
		let x = Math.random() - 0.5;
		let y = Math.random() - 0.5;
		let z = Math.random() - 0.5;
		this.pos = new THREE.Vector3(x, y, z/2).multiplyScalar(globalSpread);
	}

	draw(points) {
		for (let point of points) {
			point.multiplyScalar(globalScale);
			point.x += (this.pos.x * globalScale) + globalOffset.x;
			point.y += (this.pos.y * globalScale) + globalOffset.y;
			point.z += (this.pos.z * globalScale) + globalOffset.z;
		}
		let geoBuffer = new THREE.BufferGeometry().setFromPoints(points);
		let geo = new MeshLine();
		geo.setGeometry(geoBuffer);

		let newLine;
		if (armRegenerate) {
			newLine = new THREE.Mesh(geo.geometry, mat3);
		} else {
			if (Math.random() < 0.2) {
				newLine = new THREE.Mesh(geo.geometry, mat2);
			} else {
				newLine = new THREE.Mesh(geo.geometry, mat1);
			}
		}

		scene.add(newLine);
	}

	createCmds(size) {
		let geno = [];
		for (let i=0; i<size; i++) {
			geno.push(lexicon[parseInt(Math.random() * lexicon.length)]);	
		}
		return geno;
	}

}

function regenerate(chosen) {
	let newpop = [];
	let parent = pop[chosen];
	
	for (let i=0; i<pop_size; i++) {
		let child = new Child();
		
		for (let j=0; j<parent.cmds.length; j++) {
			if (Math.random() < mutability / parent.cmds.length) {
				child.cmds[j] = lexicon[parseInt(Math.random() * lexicon.length)];
			} else {
				child.cmds[j] = parent.cmds[j];
			}
		}

		newpop.push(child);
	}
	pop = newpop;

	resetCameraPosition();
}

let armRegenerate = false;
let armRegenerateIndex = 0;

function draw() {
	requestAnimationFrame(draw);

	// clear scene
	scene.remove.apply(scene, scene.children);

	for (let i=0; i<pop.length; i++) {	
		let turtle = new Turtle(new THREE.Vector3(0.5, 0.9, 0), new THREE.Vector3(0, 0.1, 0), Math.PI/4);

		let lines = turtledraw(turtle, pop[i].cmds);
		pop[i].draw(lines);
		
		if (!armRegenerate && lines[0].distanceTo(camera.position) < triggerDistance) {
			console.log("Selected " + i);
			armRegenerateIndex = i;
			armRegenerate = true;
			renderer.toneMappingExposure = exposureHigh;
		}
	}

	updatePlayer();
	
	if (armRegenerate) {
		setTimeout(function() {
			regenerate(armRegenerateIndex);
			armRegenerate = false;		
			renderer.toneMappingExposure = exposureLow;			
		}, 200);
	}

	//console.log("!!! " + rotateStart.x + ", " + rotateStart.y + " | " + rotateEnd.x + ", " + rotateEnd.y + " | " + rotateDelta.x + ", " + rotateDelta.y);

	composer.render();
}

window.addEventListener("keydown", function(event) {
	if (util.getKeyCode(event) === ' ')	regenerate(parseInt(Math.random() * pop.length));	    
});

window.onload = reset;