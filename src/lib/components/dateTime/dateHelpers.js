// @ts-nocheck
export function formatDate(date, onlydate=false) {
  date = new Date(date);
  let formattedDate = "";
  if(onlydate){
    formattedDate = `${padTo2Digits(date.getDate())} ${
      Months[date.getMonth()]
    } ${date.getFullYear()}`
  }else{
  formattedDate = `${padTo2Digits(date.getDate())} ${
    Months[date.getMonth()]
  } ${date.getFullYear()}, ${padTo2Digits(date.getHours())}:${padTo2Digits(
    date.getMinutes()
  )}`
}
  
  return formattedDate;
}

const Months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function padTo2Digits(num) {
  return num.toString().padStart(2, "0");
}
