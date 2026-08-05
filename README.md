# n8n-nodes-vatnode

Validate EU VAT numbers against the official [VIES](https://ec.europa.eu/taxation_customs/vies/) register and look up EU VAT rates inside your n8n workflows, powered by [vatnode](https://vatnode.dev).

Useful when a workflow onboards a business customer, issues an invoice, or decides whether to apply the reverse charge — anywhere a VAT number has to be true rather than merely well-formed.

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and use the package name `n8n-nodes-vatnode`.

## Operations

### VAT Number

| Operation | API key | What it does |
| --- | --- | --- |
| Validate | Required | Verifies the number against the live VIES register. Returns validity, registered company name and address, registration date, and the VIES consultation number when your account has a requester VAT configured. Spends one request from your monthly quota. |
| Check Format | Not needed | Checks the number against its country pattern. Runs entirely offline: no network call, no quota. A valid format does not mean the VAT exists. |

### VAT Rate

| Operation | API key | What it does |
| --- | --- | --- |
| Get | Not needed | Standard, reduced, super-reduced and parking rates for one country, plus the VAT number format. |
| Get Many | Not needed | The same for every covered country, one n8n item per country. |

Rate data comes from the European Commission's Taxes in Europe Database and is refreshed daily.

## Credentials

Only the Validate operation needs credentials. Create an API key in your [vatnode dashboard](https://vatnode.dev) — the free plan includes a monthly request quota and no card is required — then add a **Vatnode API** credential in n8n and paste the key.

The credential test sends the reserved `XX0000001` test VAT number, which never reaches VIES and never spends quota.

## Coverage

VIES validation covers the 27 EU member states plus XI (Northern Ireland). Rate lookups cover those plus around 17 other European jurisdictions, which are rate-lookup only. Greece is `EL`, not `GR` — that is the VIES convention, and vatnode follows it.

## Example

A typical onboarding workflow:

1. **Check Format** filters out typos for free.
2. **Validate** confirms the surviving numbers against VIES.
3. A downstream IF node routes on `valid`, and the `consultationNumber` is stored with the customer record as audit evidence.

## Compatibility

Tested against n8n 1.x. Requires Node.js 20.15 or newer.

## Resources

- [vatnode API documentation](https://vatnode.dev/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE)
