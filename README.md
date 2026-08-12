# n8n-nodes-vatnode

Validate EU VAT numbers against the official [VIES](https://ec.europa.eu/taxation_customs/vies/) register and look up EU VAT rates inside your n8n workflows. Uses the [vatnode](https://vatnode.dev) API.

Use it when a workflow onboards a business customer, issues an invoice, or decides whether the reverse charge applies — cases where the number has to be registered, not just correctly formatted.

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/) and use the package name `n8n-nodes-vatnode`.

## Operations

### VAT Number

| Operation | API key | What it does |
| --- | --- | --- |
| Validate | Required | Verifies the number against the live VIES register. Returns validity, registered company name and address, registration date, and the VIES consultation number when your account has a requester VAT configured. Spends one request from your monthly quota. |
| Check Format | Not needed | Checks the number against its country pattern. Runs offline: no network call, no quota. A valid format does not mean the number is registered. |

### VAT Rate

| Operation | API key | What it does |
| --- | --- | --- |
| Get | Not needed | Standard, reduced, super-reduced and parking rates for one country, plus the VAT number format. |
| Get Many | Not needed | The same for every covered country, one n8n item per country. |

Rate data comes from the European Commission's Taxes in Europe Database, checked daily against that source and updated on any change.

## Credentials

Only the Validate operation needs credentials. Everything else runs without an account.

To get a key:

1. Create an account at [vatnode.dev/register](https://vatnode.dev/register). No card required, and the free plan includes a monthly request quota.
2. Open **Dashboard → API Keys** ([vatnode.dev/dashboard/api-keys](https://vatnode.dev/dashboard/api-keys)) and create a key. Live keys start with `vat_live_`. Every account also gets a `vat_test_` key, which returns fixture data for any VAT number and never spends quota — useful while you build the workflow.
3. In n8n, add a new **Vatnode API** credential and paste the key.

Worth doing: set your own VAT number under **Dashboard → Account details → Requester VAT**. VIES then issues a consultation number with every successful check, and vatnode returns it as `consultationNumber`. Keep it with the invoice record — that is the evidence a tax auditor asks for.

The credential test sends the reserved `XX0000001` test VAT number, which never reaches VIES and never spends quota.

## Coverage

VIES validation covers the 27 EU member states plus XI (Northern Ireland). Rate lookups cover those plus around 17 other European jurisdictions (rates only, no VIES validation). Greece is `EL`, not `GR` — that is the VIES convention, and vatnode follows it.

## Templates

Three workflows are ready to import from [`templates/`](templates):

- [Validate a VAT number submitted through a form](templates/validate-vat-from-form.json)
- [Decide reverse charge before issuing an invoice](templates/validate-before-invoicing.json)
- [Re-check customer VAT numbers on a schedule](templates/monitor-vat-numbers.json)

Import one with **Workflows → Import from File**.

## Example

A typical onboarding workflow:

1. **Check Format** filters out typos without spending quota.
2. **Validate** confirms the remaining numbers against VIES.
3. A downstream IF node routes on `valid`, and the `consultationNumber` is stored with the customer record as audit evidence.

## Compatibility

Tested against n8n 1.x. Requires Node.js 20.15 or newer.

## Resources

- [vatnode API documentation](https://vatnode.dev/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE)
