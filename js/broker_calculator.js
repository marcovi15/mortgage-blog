// === FORMATTERS ===
const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
});

// Select input elements
const homePriceInput = document.getElementById('home_price');
const depositInput = document.getElementById('deposit');
const durationInput = document.getElementById('duration');
const interestInput = document.getElementById('baseline_rate');
const fixedTermInput = document.getElementById('fixed_term');
const brokerFeeInput = document.getElementById('broker_fee');

const calculateButton = document.getElementById('calculate-btn');
const resultDiv = document.getElementById('result');


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

// Event listener
calculateButton.addEventListener('click', () => {
    const home_price = parseFloat(homePriceInput.value);
    const deposit = parseFloat(depositInput.value);
    const duration = parseInt(durationInput.value);
    const interest = parseFloat(interestInput.value);
    const fixedTerm = parseInt(fixedTermInput.value);
    const brokerFee = parseFloat(brokerFeeInput.value);

    rateWithBroker = calculateRateWithBroker(brokerFee, loan, durationYears, targetTermYears, baselineIntRatePerc)
    resultDiv.innerHTML = `The broker should get you an interest rate of ${rateWithBroker.toFixed(2)}%`;
});
