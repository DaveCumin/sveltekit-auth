// Cholesky decomposition of the covariance matrix L. See equation (4) in https://en.wikipedia.org/wiki/Cholesky_decomposition
// @ts-ignore
function choleskyDecomposition(matrix) {
	const n = matrix.length;
	const L = Array.from({ length: n }, () => Array(n).fill(0));

	for (let i = 0; i < n; i++) {
		for (let j = 0; j <= i; j++) {
			let sum = 0;

			for (let k = 0; k < j; k++) {
				sum += L[i][k] * L[j][k];
			}

			if (i === j) {
				L[i][j] = Math.sqrt(matrix[i][i] - sum);
			} else {
				L[i][j] = (matrix[i][j] - sum) / L[j][j];
			}
		}
	}

	return L;
}

// Using Box-Muller transform to generate standard normal samples. See https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
// @ts-ignore
export function generateStandardNormalSample(size, seed = null) {
	let prng = splitmix32((Math.random() * 2 ** 32) >>> 0);
	if (seed != null) {
		prng = splitmix32(seed);
	}

	return Array.from({ length: size }, () => {
		const u1 = prng();
		const u2 = prng();
		return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	});
}

// @ts-ignore
export function sampleMultivariateNormal(mean, covariance, seed = null) {
	const size = mean.length;

	// Step 1: Generate standard normal samples
	const Z = generateStandardNormalSample(size, seed);

	// Step 2: Cholesky decomposition of the covariance matrix
	const L = choleskyDecomposition(covariance);

	// Step 3: Transform the standard normal samples
	const X = Array(size).fill(0);
	for (let i = 0; i < size; i++) {
		for (let j = 0; j <= i; j++) {
			X[i] += L[i][j] * Z[j];
		}
		X[i] += mean[i];
	}

	return X;
}

//RANDOM NUMBER GENERATION WITH SEED: see https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// @ts-ignore
function splitmix32(a) {
	return function () {
		a |= 0;
		a = (a + 0x9e3779b9) | 0;
		let t = a ^ (a >>> 16);
		t = Math.imul(t, 0x21f0aaad);
		t = t ^ (t >>> 15);
		t = Math.imul(t, 0x735a2d97);
		return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
	};
}
