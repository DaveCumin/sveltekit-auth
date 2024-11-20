// @ts-nocheck
import { writable, get, derived } from 'svelte/store';
import { sampleMultivariateNormal, generateStandardNormalSample } from './sampling';
import { integrateRK4 } from './integration';

export let seed = writable(8336);

//-------------------------------------------------------
//------- MODEL RUNNING PARAMETERS ----------------------
//-------------------------------------------------------
export let modelParams = writable({
	timeStart: 0,
	timeEnd: 7,
	dt: 0.005
});

//-------------------------------------------------------
//------- PARAMETERS ------------------------------------
//-------------------------------------------------------
export let params = writable({
	POP_RATEIN: 4.01,
	POP_CL: 44.2,
	POP_VC: 15,
	POP_TELB: 0.998,
	POP_SLOPEB: 609,
	POP_MTT: 0.52,
	POP_NT: 20,
	POP_TM50: 32.4,
	POP_HILL: 9.14,
	F_RESP: 2.9,
	F_LOWAPG1: 0.355,
	F_STER: 1.33,
	POP_TELS: 2.49,
	POP_SLOPES1: 139,
	POP_SLOPEDSC: 4.22,
	WT: 3.5,
	RESP: 0,
	PMAW: 40,
	LOWAPG1: 0,
	STER: 0
});

//-------------------------------------------------------
//---- PVVS ---------------------------------------------
//-------------------------------------------------------
export let pvvs = writable({
	PPV_RATEIN: [2.25],
	PPV_CL: [2.26, 2.44],
	PPV_SLOPEB: [0.57, 0.429, 1.68],
	PPV_MTT: [0.00015, 0.192, -0.2, 0.82],
	PPV_TM50: [0.0522, 0.096, -0.0129, 0.041, 0.013],

	PPV_TELS: 0,
	PPV_SLOPES1: 1.924,
	PPV_SLOPEDSC: 0,
	PPV_TELB: 0,
	PPV_HILL: 0
});

export let PVVS_set0 = writable(false);
function generatePVVs() {
	let pvvsCopy = structuredClone(get(pvvs));
	if (get(PVVS_set0)) {
		Object.entries(get(pvvs)).forEach(([key, value]) => {
			pvvsCopy[key] = 0;
		});
		return pvvsCopy;
	}
	let covMatrix = [];
	let singleValues = {};
	let maxLength = 0;

	// First pass: determine the size of the covariance matrix and collect single values
	Object.entries(pvvsCopy).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			maxLength = Math.max(maxLength, value.length);
			pvvsCopy[key] = value;
		} else {
			singleValues[key] = value;
		}
	});

	// Second pass: build the covariance matrix
	for (let i = 0; i < maxLength; i++) {
		covMatrix[i] = Object.values(pvvsCopy)
			.filter(Array.isArray)
			.map((arr) => arr[i] || 0);
	}
	// Make the covariance matrix symmetric
	for (let i = 0; i < maxLength; i++) {
		for (let j = i + 1; j < maxLength; j++) {
			covMatrix[j][i] = covMatrix[i][j];
		}
	}

	// Combine the covariance matrix and single values
	let result = {
		covMatrix: covMatrix,
		...singleValues
	};

	// Generate samples for the covariance matrix
	if (covMatrix.length > 0) {
		const samples = sampleMultivariateNormal(
			new Array(covMatrix.length).fill(0),
			covMatrix,
			get(seed)
		);

		// Update the pvvsCopy with the sampled values
		Object.keys(pvvsCopy).forEach((key, index) => {
			if (Array.isArray(pvvsCopy[key])) {
				pvvsCopy[key] = samples[index];
			}
		});
	}

	// Generate samples for single values
	Object.keys(singleValues).forEach((key) => {
		pvvsCopy[key] =
			generateStandardNormalSample(1, get(seed))[0] * Math.sqrt(Math.abs(pvvsCopy[key]));
	});
	return pvvsCopy;
}
export let localpvvs = writable(generatePVVs());

//-------------------------------------------------------
//----- CALCS -------------------------------------------
//-------------------------------------------------------
function doCalcs(p = get(params), lpvvs = get(localpvvs)) {
	console.log('doCalcs');
	const TM50 = p.POP_TM50 * Math.exp(lpvvs.PPV_TM50);
	const HILL = parseInt(p.POP_HILL * Math.exp(lpvvs.PPV_HILL));

	const FPREM = 1 / (1 + Math.pow(p.PMAW / TM50, -HILL));
	const F_STER_RIN = p.STER === 1 ? p.F_STER : 1;
	const F_RESP_SL = p.RESP >= 1 ? p.F_RESP : 1;
	const F_LOWAPG1_SL = p.LOWAPG1 === 1 ? p.F_LOWAPG1 : 1;

	const TELB = p.POP_TELB * Math.exp(lpvvs.PPV_TELB) * Math.pow(p.WT / 70, 0.25);
	const KELB = Math.log(2) / TELB;
	const SLOPEBE = p.POP_SLOPEB * Math.exp(lpvvs.PPV_SLOPEB) * F_RESP_SL * F_LOWAPG1_SL;
	const VB = 1;
	const MTT = p.POP_MTT * Math.exp(lpvvs.PPV_MTT);
	const KTR = p.POP_NT / MTT;

	const TELS = p.POP_TELS * Math.exp(lpvvs.PPV_TELS) * Math.pow(p.WT / 70, 0.25);
	const KELS = Math.log(2) / TELS;
	const SLOPES1 = p.POP_SLOPES1 * Math.exp(lpvvs.PPV_SLOPES1);
	const SLOPEDSC = p.POP_SLOPEDSC * Math.exp(lpvvs.PPV_SLOPEDSC);
	const VS = 1;

	const VC = p.POP_VC * (p.WT / 70);
	const CL = p.POP_CL * Math.exp(lpvvs.PPV_CL) * FPREM * Math.pow(p.WT / 70, 0.75);
	const RATEIN_PCT =
		p.POP_RATEIN * Math.exp(lpvvs.PPV_RATEIN) * Math.pow(p.WT / 70, 0.75) * F_STER_RIN;

	const initialPCT = (RATEIN_PCT / CL) * VC;

	return {
		TM50,
		HILL,
		FPREM,
		F_STER_RIN,
		F_RESP_SL,
		F_LOWAPG1_SL,
		TELB,
		KELB,
		SLOPEBE,
		VB,
		KTR,
		MTT,
		TELS,
		KELS,
		SLOPES1,
		SLOPEDSC,
		VS,
		VC,
		CL,
		RATEIN_PCT,
		initialPCT
	};
}
export let calculated_new = writable(doCalcs());
//-------------------------------------------------------
//----- GLOBALS -----------------------------------------
//-------------------------------------------------------
export let globals = writable({
	t: [],
	CONCS1: [],
	CONCDSC: [],
	CONCS2: [],
	CONCB: [],
	CONCPCT: [],
	WT: [],
	CL: []
});

//-------------------------------------------------------
//--- ROWS ----------------------------------------------
//-------------------------------------------------------
export let rows = writable([{ TIME: 0, AMT: 2 / 24, RATE: 1, CMT: 1 }]);

//-------------------------------------------------------
//--- MODEL----------------------------------------------
//-------------------------------------------------------

function model(t, y, calc = get(calculated_new)) {
	// Calculations for SYNB and SYNS
	const SYNB = 1 + calc.SLOPEBE * (y[5] / 1);
	const SYNS = 1 + calc.SLOPES1 * (y[1] / 1);

	// Constants for RATE and AMT
	const RATE = 1;
	const AMT = 2 / 24;

	// Initialize the derivative array
	const dy = new Array(y.length).fill(0);

	// Calculate derivatives for each compartment
	dy[0] = -calc.KTR * y[0]; //Transit1
	dy[1] = -calc.KELS * y[1]; //Surgery
	dy[2] = calc.RATEIN_PCT * SYNB * SYNS - (y[2] / calc.VC) * calc.CL; //PCT
	dy[3] = -calc.KELS * y[3]; //DSC
	dy[4] = -calc.KELS * y[4]; //Surgery2
	dy[5] = calc.KTR * y[y.length - 1] - calc.KELB * y[5]; //Birth
	dy[6] = calc.KTR * y[0] - calc.KTR * y[6]; //Transit2
	// Update the derivatives for the transit compartments
	for (let i = 7; i < y.length; i++) {
		dy[i] = calc.KTR * y[i - 1] - calc.KTR * y[i]; //Transit3-Transit20
	}

	//The rows (change in weight or conc boost)
	const row = get(rows);
	for (let r = 0; r < row.length; r++) {
		// If the time is correct
		if (
			t - row[r].TIME <= row[r].AMT / row[r].RATE && // start counting the amt/rate from the start time
			t >= row[r].TIME //start the admin from the start time
		) {
			dy[row[r].CMT - 1] += row[r].RATE; // ADD THE DOSE
		}

		//If its a measurement to change weight
		if (
			row[r].WT && //if there is a weight value
			row[r].TIME > t //if the time is before the weight has updated
		) {
			//calculate the change to add
			const dWT = row[r].WT - $params.WT;
			const dWTt = row[r].TIME - t;
			$params.WT += (dWT / dWTt) * $modelParams.dt;
			console.log('t ', t, '; dWT: ', dWT, '; dWTt: ', dWTt, '; wt: ', $params.WT);
		}
	}

	updateGlobals(t, y);
	return dy;
}
function updateGlobals(t, y, p = get(params), calc = get(calculated_new)) {
	//Update globals
	globals.update((current) => {
		return {
			...current, // Spread the existing properties of the object
			t: [...current.t, t],
			CONCS1: [...current.CONCS1, y[1] / calc.VS],
			CONCDSC: [...current.CONCDSC, y[3] / calc.VS],
			CONCS2: [...current.CONCS2, y[4] / calc.VS],
			CONCB: [...current.CONCB, y[5] / calc.VB],
			CONCPCT: [...current.CONCPCT, y[2] / calc.VC],
			WT: [...current.WT, p.WT],
			CL: [...current.CL, calc.CL]
		};
	});
}

function doModel(
	p = get(params),
	lpvvs = get(localpvvs),
	calc = get(calculated_new),
	modelPars = get(modelParams)
) {
	//initialise globals
	let temp = structuredClone(get(globals));
	Object.keys(temp).forEach((key) => {
		temp[key] = [];
	});
	globals.set(temp);

	//set up the pvvs
	localpvvs.set(generatePVVs());

	//get calculated values
	calculated_new.set(doCalcs());

	//set up initial conditions
	let initialConditionsArray = Array(25).fill(0);
	initialConditionsArray[2] = calc.initialPCT;

	const resultRK4 = integrateRK4(
		(t, y) => model(t, y),
		initialConditionsArray,
		modelPars.timeStart,
		modelPars.timeEnd,
		modelPars.dt
	);

	modelResult.set(resultRK4);
	return 1;
}

//--- DERIVEDTHE UPDATES
export let modelResult = writable();

params.subscribe((value) => {
	doModel(value, get(localpvvs), get(calculated_new), get(modelParams));
});

modelParams.subscribe((value) => console.log('modelParams updated:', value));

//-------------------------------------------------------
//----- PATIENT DATA FOR TESTING ------------------------
//-------------------------------------------------------
export let pts = writable({
	baseline: {
		birthDateTime: '2022-05-01T17:44',
		birthWeight: 3.5,
		gestationalAge_weeks: 40,
		RDS: 0,
		MAS: 0,
		LOWAPG: 0,
		postSurgical: 0,
		measurements: {}
	},
	a: {
		birthDateTime: '2022-05-01T17:44',
		birthWeight: 2.5,
		gestationalAge_weeks: 40,
		RDS: 0,
		MAS: 1,
		LOWAPG: 1,
		postSurgical: 0,
		measurements: {}
	},
	b: {
		birthDateTime: '2023-01-11T08:12',
		birthWeight: 4.5,
		gestationalAge_weeks: 40,
		RDS: 1,
		MAS: 0,
		LOWAPG: 0,
		postSurgical: 1,
		surgeryDate: '2023-01-12T09:42',
		surgeryDuration: 2,
		surgerySteroids: 0,
		weight: 5.5,
		measurements: [
			{
				time: '2023-01-13T22:41:40',
				conc: 0.1,
				weight: 5.5
			}
		]
	}
});

//TO DELETE
export let calculated = writable({
	TM50: 0,
	HILL: 0,
	FPREM: 0,
	F_STER_RIN: 0,
	F_RESP_SL: 0,
	F_LOWAPG1_SL: 0,
	TELB: 0,
	KELB: 0,
	SLOPEBE: 0,
	VB: 0,
	KTR: 0,
	MTT: 0,
	TELS: 0,
	KELS: 0,
	SLOPES1: 0,
	SLOPEDSC: 0,
	VS: 0,
	VC: 0,
	CL: 0,
	RATEIN_PCT: 0,
	initialPCT: 0
});
