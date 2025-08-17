// === FORMATTERS ===
const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
});

// === FUNCTIONS FROM PYTHON TRANSLATION ===

function calculateMonthlyPayment(loan, durationYears, intRatePerc) {
    const durationMonths = durationYears * 12;
    const rFactor = 1 + (intRatePerc / 100 / 12);
    const factorOne = loan * Math.pow(rFactor, durationMonths);
    const factorTwo = Math.pow(rFactor, durationMonths) - 1;
    return (factorOne / factorTwo) * (rFactor - 1);
}

function calculateInterestPaid(loan, intRatePerc, monthlyPay, targetTermYears) {
    const targetTermMonths = targetTermYears * 12;
    const intRateMonth = intRatePerc / 100 / 12;
    const grossInterest = (loan * intRateMonth) - monthlyPay;
    const compoundFactor = (Math.pow(1 + intRateMonth, targetTermMonths) - 1) / intRateMonth;
    const paidInTerm = monthlyPay * targetTermMonths;
    return grossInterest * compoundFactor + paidInTerm;
}

function createWrapperForInterestCalc(loan, monthlyPay, targetTermYears) {
    return function(intRate) {
        return calculateInterestPaid(loan, intRate, monthlyPay, targetTermYears);
    }
}

function solveByInterestPaid(interestFunc, interestTarget,
                             rLow=0.01, rHigh=10,
                             tolF=1e-9, tolR=1e-12, maxIter=200) {
    function evalError(r) { return interestFunc(r) - interestTarget; }
    let fLow = evalError(rLow);
    let fHigh = evalError(rHigh);

    while (fLow * fHigh > 0 && rHigh < 10) {
        rHigh *= 2;
        fHigh = evalError(rHigh);
    }
    if (fLow * fHigh > 0) throw new Error("Could not bracket a root.");

    for (let i = 0; i < maxIter; i++) {
        const mid = 0.5 * (rLow + rHigh);
        const fMid = evalError(mid);
        if (Math.abs(fMid) < tolF || (rHigh - rLow) < tolR) return mid;
        if (fLow * fMid <= 0) { rHigh = mid; fHigh = fMid; }
        else { rLow = mid; fLow = fMid; }
    }
    return 0.5 * (rLow + rHigh);
}

function calculateRateWithBroker(brokerFee, loan, durationYears, targetTermYears, baselineIntRatePerc) {
    const monthlyPay = calculateMonthlyPayment(loan, durationYears, baselineIntRatePerc);
    const interestPaidWithoutBroker = calculateInterestPaid(loan, baselineIntRatePerc, monthlyPay, targetTermYears);
    const interestPaidWithBroker = interestPaidWithoutBroker - brokerFee;
    const fixedIntFunction = createWrapperForInterestCalc(loan, monthlyPay, targetTermYears);
    return solveByInterestPaid(fixedIntFunction, interestPaidWithBroker);
}

// === RUN CALCULATION ON BUTTON CLICK ===
function runCalculation() {
  const home_price = parseFloat(document.getElementById("home_price").value);
  const deposit = parseFloat(document.getElementById("deposit").value);
  const duration = parseFloat(document.getElementById("duration").value);
  const baselineRate = parseFloat(document.getElementById("baselineRate").value);
  const term = parseFloat(document.getElementById("term").value);
  const brokerFee = parseFloat(document.getElementById("brokerFee").value);
  const loan = home_price - deposit;

  try {
    const result = calculateRateWithBroker(brokerFee, loan, duration, term, baselineRate);
    document.getElementById("output").innerHTML =
      `The broker must secure a rate ≤ <b>${result.toFixed(2)}%</b> to be worth the fee.`;
  } catch (e) {
    document.getElementById("output").innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
  }
}
