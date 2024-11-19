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

function createCalculated() {
	const { subscribe, set } = writable(themodel());

	function themodel() {
		const p = get(params);
		const c = get(calculated);
		const lp = get(localpvvs);

		// the model equations
		c.TM50 = p.POP_TM50 * Math.exp(lp.PPV_TM50);
		c.Hill = parseInt(p.POP_HILL * Math.exp(lp.PPV_HILL));

		c.FPREM = 1 / (1 + Math.pow(p.PMAW / c.TM50, -c.Hill));
		c.F_STER_RIN = p.STER === 1 ? p.F_STER : 1;
		c.F_RESP_SL = p.RESP >= 1 ? p.F_RESP : 1;
		c.F_LOWAPG1_SL = p.LOWAPG1 === 1 ? p.F_LOWAPG1 : 1;

		c.TELB = p.POP_TELB * Math.exp(lp.PPV_TELB) * Math.pow(p.WT / 70, 0.25);
		c.KELB = Math.log(2) / c.TELB;
		c.SLOPEBE = p.POP_SLOPEB * Math.exp(lp.PPV_SLOPEB) * c.F_RESP_SL * c.F_LOWAPG1_SL;
		c.VB = 1;
		c.MTT = p.POP_MTT * Math.exp(lp.PPV_MTT);
		c.KTR = p.POP_NT / c.MTT;

		c.TELS = p.POP_TELS * Math.exp(lp.PPV_TELS) * Math.pow(p.WT / 70, 0.25);
		c.KELS = Math.log(2) / c.TELS;
		c.SLOPES1 = p.POP_SLOPES1 * Math.exp(lp.PPV_SLOPES1);
		c.SLOPEDSC = p.POP_SLOPEDSC * Math.exp(lp.PPV_SLOPEDSC);
		c.VS = 1;

		c.VC = p.POP_VC * (p.WT / 70);
		c.CL = p.POP_CL * Math.exp(lp.PPV_CL) * c.FPREM * Math.pow(p.WT / 70, 0.75);
		c.RATEIN_PCT =
			p.POP_RATEIN * Math.exp(lp.PPV_RATEIN) * Math.pow(p.WT / 70, 0.75) * c.F_STER_RIN;

		c.initialPCT = (c.RATEIN_PCT / c.CL) * c.VC;

		calculated.set(c);
	}
	params.subscribe(() => {
		set(themodel());
	});
	calclated.subscribe(() => {
		set(themodel());
	});
	localpvvs.subscribe(() => {
		set(themodel());
	});
	return {
		subscribe,
		run: () => set(themodel())
	};
}

export const calculated = createCalculated();

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
