# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Email **mahmudulhasan46367@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (URLs, requests, screenshots),
- any suggested fix.

You'll get an acknowledgement within 3 working days. Please give us reasonable
time to fix the issue before disclosing it.

## Scope

- The storefront and admin at https://chajoy-bd.vercel.app
- This repository's source code

Payment processing is handled by SSLCommerz; card and wallet details never reach
this application.

## Security measures

An overview of authentication, session handling, rate limiting, payment
validation and HTTP security headers is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security).
