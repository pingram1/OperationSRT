/**
 * Server-side membership total (USD) from plan + session configuration.
 * Do not trust client-submitted price for payment settlement.
 * @param {import('mongoose').Document|object} plan
 * @param {object|null|undefined} sessionConfiguration
 * @returns {number}
 */
function computeMembershipTotalUsd(plan, sessionConfiguration) {
  if (!plan) return 0;
  if (plan.priceType === 'free' || (Number(plan.price) || 0) === 0) return 0;
  let total = Number(plan.price) || 0;
  if (
    plan.name === 'Summa Cum Laude'
    && sessionConfiguration?.additionalOption
    && plan.sessionConfig?.additionalSessionOptions?.length
  ) {
    const opt = plan.sessionConfig.additionalSessionOptions.find(
      (o) => o.label === sessionConfiguration.additionalOption
    );
    if (opt) {
      total += Number(opt.additionalCost) || 0;
    }
  }
  return Math.round(total * 100) / 100;
}

module.exports = { computeMembershipTotalUsd };
