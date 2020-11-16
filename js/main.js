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
const meshLineResolution = 1;

function clearScene(obj) {
	while (obj.children.length > 0) { 
		clearScene(obj.children[0]);
		obj.remove(obj.children[0]);
	}
	
	if (obj.geometry) obj.geometry.dispose();

	if (obj.material) { 
		// in case of map, bumpMap, normalMap, envMap ...
		Object.keys(obj.material).forEach(prop => {
			if (!obj.material[prop]) {
				return;         
			}
			if (obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function') {
				obj.material[prop].dispose();
			}                                                  
		});
		obj.material.dispose();
	}
}   

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

const globalScale = new THREE.Vector3(50, -50, 50);
const globalOffset = new THREE.Vector3(-20, 60, -350); 
const globalSpeedFactor = 4;
const globalSpread = 7;

const axisX = new THREE.Vector3(1, 0, 0);
const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);

const triggerDistance = 35;

movingSpeedMax = 1.3;
movingDelta = 0.03;

let now = 0;

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
const angleChange = 1.25;
let firstRun = true;
const maxComplexity = 400;

function reset() {
	pop = [];
	for (let i=0; i<pop_size; i++) {
		pop.push(new Child());
	}

	if (firstRun) {
		setupPlayer();
		draw();
		firstRun = false;
	}
}

class Child {

	constructor() {
		this.cmds = this.createCmds(numCmds);
		let x = Math.random() - 0.5;
		let y = Math.random() - 0.5;
		let z = Math.random() - 0.5;
		this.pos = new THREE.Vector3(x, y, z/2).multiplyScalar(globalSpread).multiply(globalScale);
		this.randomDrift = 500 + (Math.random() * 500);
		this.points = [];
		this.geo = new MeshLine();
		this.geoBuffer = new THREE.BufferGeometry();
		this.newLine;
		this.brain = new Brain();
		this.head;
		this.tail;
		this.vel = new THREE.Vector3(0,0);
		this.size = triggerDistance;
	}

	updateBrain() {
		this.head = this.points[0].clone();
		this.tail = this.points[this.points.length-1].clone();
		let input0 = 0;
		let input1 = 0;
		let input2 = 0;

		let mindist = 2; // 2;
      
		// get relative vector from my head to its tail:
		let rel = new THREE.Vector3(0,0,0);//this.tail.clone().sub(this.head).rotate(-this.vel.angle());
		let distance = rel.length();
		// TODO: could also limit relative angle here
		if (distance < mindist) {
			mindist = distance;

			// update sensors, which should range from 0..1

			// for distance we'd like intensity to be highest when near, lowest when far; a 1/distance-squared is good; 
			// and made relative to our size:
	        input0 = this.size / (this.size + rel.dot(rel));

	        // relative angle ordinarily runs -pi...pi
	        // we can take the cosine of the angle to get -1..1
	        // then scale this to 0..1:
	        input1 = 1.0; //Math.cos(rel.angle(1)) * 0.5 + 0.5; 
	        
	        // 3rd input tells us whether we are closer to the head or the tail:
	        let distance2 = this.head.distanceTo(this.tail)
	        input2 = distance2 < distance ? 0 : 1;

			// store relative vector here for sake of visualization later
			this.rel = rel;
		}

		// ~ ~ ~ ~ ~

		this.brain.update(input0, input1, input2);
	    let speed = this.brain.outputs[0];
	    let angle = this.brain.outputs[1] - this.brain.outputs[2];
	    this.vel.applyAxisAngle(axisX, angle);
	    this.pos.add(this.vel);
	}

	draw() {
		let turtle = new Turtle(new THREE.Vector3(0.5, 0.9, 0), new THREE.Vector3(0, 0.1, 0), Math.PI/4);

		this.points = this.turtledraw(turtle, this.cmds);

		this.updateBrain();

		this.pos.y += Math.sin(now*10) / this.randomDrift;
	
		for (let point of this.points) {
			point.multiply(globalScale).add(this.pos).add(globalOffset);
		}
		this.geoBuffer.setFromPoints(this.points);
		this.geo.setGeometry(this.geoBuffer);

		//let newLine;
		if (armRegenerate) {
			this.newLine = new THREE.Mesh(this.geo.geometry, mat3);
		} else {
			if (Math.random() < 0.2) {
				if (armRedmat) {
					this.newLine = new THREE.Mesh(this.geo.geometry, mat3);
				} else {
					this.newLine = new THREE.Mesh(this.geo.geometry, mat2);
				}
			} else {
				this.newLine = new THREE.Mesh(this.geo.geometry, mat1);
			}
		}

		scene.add(this.newLine);
	}

	createCmds(size) {
		let geno = [];
		for (let i=0; i<size; i++) {
			geno.push(lexicon[parseInt(Math.random() * lexicon.length)]);	
		}
		return geno;
	}

	turtledraw(t, cmds) {
		let lines = [];
		now = clock.getElapsedTime() / globalSpeedFactor;
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
				t.angle *= angleChange;
			} else if (cmd == ">") {
				t.angle /= angleChange;
			} else if (cmd == "(") {
				// spawn a copy of the turtle:
				let t1 = new Turtle(t.pos.clone(), t.dir.clone(), -t.angle);

				let morelines = this.turtledraw(t1, cmds.slice(i+1));
				lines = lines.concat(morelines);
			}
		}

		if (lines.length > maxComplexity) lines.length = maxComplexity;

		return lines;
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
let armRedmat = false;
let armRegenerateIndex = 0;

function draw() {
	clearScene(scene);

	for (let i=0; i<pop.length; i++) {	
		try {
			pop[i].draw();
		
			if (!armRegenerate && pop[i].points[0].distanceTo(camera.position) < triggerDistance) {
				console.log("Selected " + i);
				armRegenerateIndex = i;
				armRegenerate = true;
				armRedmat = true;
				renderer.toneMappingExposure = exposureHigh;
			}
		} catch (e) { 
			console.log(e);
		}
	}

	updatePlayer();
	
	if (armRegenerate) {
		setTimeout(function() {
			regenerate(armRegenerateIndex);
			armRegenerate = false;		
		}, 200);
	}

	if (armRedmat) {
		setTimeout(function() {
			renderer.toneMappingExposure = exposureLow;			
			armRedmat = false;		
		}, 600);
	}

	//console.log("!!! " + rotateStart.x + ", " + rotateStart.y + " | " + rotateEnd.x + ", " + rotateEnd.y + " | " + rotateDelta.x + ", " + rotateDelta.y);

	composer.render();

	requestAnimationFrame(draw);
}

window.addEventListener("keydown", function(event) {
	if (util.getKeyCode(event) === ' ')	reset(); //regenerate(parseInt(Math.random() * pop.length));	    
});

window.onload = reset;