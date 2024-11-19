// @ts-nocheck
export function formatDate(date, onlydate = false, type = 'output') {
	date = new Date(date);
	let formattedDate = '';

	if (type == 'output') {
		if (onlydate) {
			formattedDate = `${padTo2Digits(date.getDate())} ${
				Months[date.getMonth()]
			} ${date.getFullYear()}`;
		} else {
			formattedDate = `${padTo2Digits(date.getDate())} ${
				Months[date.getMonth()]
			} ${date.getFullYear()}, ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}`;
		}
	} else {
		//Used to format the date for input as minDate and maxDate into the DateTimeSelect component
		if (onlydate) {
			formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${padTo2Digits(
				date.getDate()
			)}`;
		} else {
			formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${padTo2Digits(
				date.getDate()
			)}T${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}`;
		}
	}

	return formattedDate;
}

const Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function padTo2Digits(num) {
	return num.toString().padStart(2, '0');
}
