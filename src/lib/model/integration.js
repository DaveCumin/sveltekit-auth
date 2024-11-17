// Integrate using the Runge-Kutta 4th order method. See https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods
// @ts-ignore
export function integrateRK4(model, y0, t0, t1, dt) {
	let y = y0;
	let t = t0;
	let ys = [y];
	let ts = [t];

	while (t < t1) {
		let k1 = model(t, y);
		let k2 = model(
			t + 0.5 * dt,
			// @ts-ignore
			y.map((val, i) => val + 0.5 * dt * k1[i])
		);
		let k3 = model(
			t + 0.5 * dt,
			// @ts-ignore
			y.map((val, i) => val + 0.5 * dt * k2[i])
		);
		let k4 = model(
			t + dt,
			// @ts-ignore
			y.map((val, i) => val + dt * k3[i])
		);

		y = y.map(
			// @ts-ignore
			(val, i) => val + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
		);
		t += dt;

		ys.push(y);
		ts.push(t);
	}

	return { ys, ts };
}
