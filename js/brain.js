"use strict";

class Brain {

	constructor() {
		this.pop = [];
		this.pop_size = 200;
		this.creature_size = 1/100
		this.SPEED_MAX = this.creature_size*10;

		this.N = 3;
		this.L = 3;
	// N+1 (to include bias) weights per neuron per layer:
		this.NUMWEIGHTS = (this.N + 1) * this.N * this.L; 
		this.MAXW = 10;

		this.gamesteps = 0;
		this.MAX_STEPS = 500;

		this.mutability = 5;
		this.elitism = 1/10;
		this.randomized = 1/20;

		this.inputs = [0, 0, 0];
		this.outputs = [0, 0, 0];
      
		this.nn = this.createNN();
		this.activations = this.createActivations();
	}

	sigmoid(x) {
		return 1 / (1 + Math.exp(-x));
	}

	srandom() {
		return (Math.random() - 0.5) * 2;
	}

	randomGene() {
		return (Math.random() * (this.MAXW*2)) - this.MAXW;
	}

	createNN() {
		let NUMWEIGHTS = (this.N + 1) * this.N * this.L; 
		let w = []
		for (let i=0; i<NUMWEIGHTS; i++) {
			w[i] = this.randomGene()
		}
		return w;
	}

	createActivations() {
		let activations = [];
		for (let l = 0; l < this.L+1; l++) {
			let layer = [];
			// iterate over neurons in the layer:
			for (let n = 0; n < this.N; n++) {
				layer[n] = 0;
			}
			activations[l] = layer;
		}
		return activations;
	}

	activate(a, inputVector) {
		let nn = a.nn;
		let activations = a.activations;
		activations[0] = inputVector;
		let w = 0; // index into the weights list
		let inputs = activations[0];
		let outputs;
		for (let l = 0; l < this.L; l++) {
			// we will activate layer l+1 by the values in layer l:
			outputs = activations[l + 1];
			// iterate over neurons in the layer:
			for (let n = 0; n < this.N; n++) {
				// start with bias term:
				let sum = nn[w++];
				// add the weighted inputs:
				for (let i = 0; i < this.N; i++) {
					// use the next weight from the NN:
					sum += inputs[i] * nn[w++];
				}
				// apply activation function:
				outputs[n] = this.sigmoid(sum);
			}
			// outputs becomes inputs of next round:
			inputs = outputs;
		}
		return outputs;
	}

}