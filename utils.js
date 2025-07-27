/* post age calculation */
const timeUnits = [
    {
        name: "seconds",
        factor: 1,
        precision: 1,
        min_value: 0,
    },
    {
        name: "minutes",
        factor: 1 / 60,
        precision: 1,
        min_value: 1,
    },
    {
        name: "hours",
        factor: 1 / (60 * 60),
        precision: 0.5,
        min_value: 1,
    },
    {
        name: "days",
        factor: 1 / (60 * 60 * 24),
        precision: 1,
        min_value: 1,
    },
    {
        name: "months",
        factor: 1 / (60 * 60 * 24 * 30),
        precision: 0.5,
        min_value: 2,
    },
    {
        name: "years",
        factor: 1 / (60 * 60 * 24 * 30 * 12),
        precision: 0.1,
        min_value: 1,
    },
];

export function calcAge(timestampSeconds) {
    const diffMillis = Date.now() / 1e3 - timestampSeconds;
    const [val, timeUnit] = timeUnits
        .map((t) => [+(diffMillis * t.factor), t])
        .reverse()
        .find(([val, t]) => val >= t.min_value);
    const val_rounded = roundToNearest(val, timeUnit.precision);
    // singular/plural
    const unit = val === 1 ? timeUnit.name.slice(0, -1) : timeUnit.name;
    return `${val_rounded} ${unit}`;
}

function roundToNearest(num, fraction) {
    const rounded = Math.round(num / fraction) * fraction;
    // Format to the same number of decimal places as the fraction
    const decimals = (fraction.toString().split(".")[1] || "").length;
    return parseFloat(rounded.toFixed(decimals));
}
