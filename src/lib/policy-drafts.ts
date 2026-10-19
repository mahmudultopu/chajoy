// Starting drafts for the policy pages. They describe only what this website
// actually does; anything that is a business decision is marked
// "[To be confirmed by CHAJOY]". Pages stay in "draft" (shown with a draft
// notice) until an admin reviews and publishes them.

export const POLICY_DRAFTS: { slug: string; title: string; body: string }[] = [
  {
    slug: "privacy",
    title: "Privacy policy",
    body: `## What we collect

When you place an order we ask for your **name** and **mobile number** so the branch can contact you, and optionally your **email**. For delivery orders we also store your **delivery address** and the **map location** you set, so the branch can find you and check the delivery distance.

If you create an account, we store your email and a securely hashed password. Saved addresses are only kept when you tick "Save this address".

## Your location

The branch finder asks your browser for your location only when you press **Use my location**. It is used to sort branches by distance and is not saved to your account or order unless you use it as a delivery location.

## Cookies

We use a small number of essential cookies: one keeps your cart, one remembers the branch you chose, and one keeps you signed in. We do not use advertising cookies.

## Payments

Online payments are processed by SSLCommerz on their own secure page. We never see or store your card, bKash or Nagad details; we only receive the payment result and a transaction reference.

## How long we keep data

[To be confirmed by CHAJOY]

## Contact

Questions about your data: bdchajoy@gmail.com · +880 1339-536491`,
  },
  {
    slug: "terms",
    title: "Terms & conditions",
    body: `## Orders

Prices are shown in Bangladeshi taka (৳) and are set per branch. The price you pay is calculated by our server when you place the order and shown before you confirm.

Each order is sent to the branch you selected. The branch confirms the order; until then it is shown as "Waiting for the branch to confirm".

## Availability

Menus and stock can differ between branches. Items that the selected branch can't make can't be ordered from that branch.

## Cancellations

[To be confirmed by CHAJOY]

## Other terms

[To be confirmed by CHAJOY]`,
  },
  {
    slug: "delivery",
    title: "Delivery policy",
    body: `## Where we deliver

Delivery is offered only by branches that have set up a delivery area. When you set your location at checkout we check the straight-line distance from the branch to your pin; this is not a driving distance.

## Fees

The delivery fee is set by each branch and shown at checkout before you place your order.

## Delivery times

We only show an estimated time when the branch has published one. [Delivery hours and timing to be confirmed by CHAJOY]

## Pickup

Where a branch offers pickup, you can order ahead and collect at the counter.`,
  },
  {
    slug: "refunds",
    title: "Refund policy",
    body: `## When refunds apply

[To be confirmed by CHAJOY]

## How refunds are paid

Online payments made through SSLCommerz are refunded through SSLCommerz. Cash orders are refunded by the branch. [Timelines to be confirmed by CHAJOY]

## Questions

Contact bdchajoy@gmail.com · +880 1339-536491 with your order number.`,
  },
];
