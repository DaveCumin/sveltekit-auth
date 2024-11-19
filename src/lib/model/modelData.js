import { writable, get } from 'svelte/store';

export let seed = writable(8336);

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

export let localpvvs = get(pvvs);

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

//PATIENT DATA FOR TESTING
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
