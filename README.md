# Guest Charging Site

A Next.js-based guest charging platform with Stripe payment integration.

## Features

- 🔌 Dynamic charge point routing via `/{chargePointId}`
- 💳 Stripe payment integration with manual capture
- ✅ 3D Secure authentication support
- 📱 Responsive design
- 🎨 Tailwind CSS styling

## Project Structure

```
app/
├── page.tsx                          # Home page
├── [chargePointId]/
│   ├── page.tsx                     # Dynamic charge point page
│   └── PaymentForm.tsx              # Payment form component
├── layout.tsx                       # Root layout
└── globals.css                      # Global styles
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Update `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_BACKEND_API_URL=https://cpms-dev.evnet.xyz
   NEXT_PUBLIC_TENANT_ID=your_tenant_id_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/CP001](http://localhost:3000/CP001) (replace `CP001` with your charge point ID)

## Usage

### Accessing a Charge Point

Navigate to `/{chargePointId}` where `chargePointId` is your unique charge point identifier.

Example: `http://localhost:3000/CP001`

### Testing Payments

Use Stripe's test card numbers:

- **Success**: `4242 4242 4242 4242`
- **3D Secure Required**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

## API Endpoints

### POST `/api/create-payment-intent`

Creates a Stripe PaymentIntent for the charging session.

**Request Body:**

```json
{
  "chargePointId": "CP001"
}
```

**Response:**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "publishableKey": "pk_test_xxx"
}
```

## Payment Flow

1. User navigates to `/{chargePointId}`
2. Frontend calls `/api/create-payment-intent` with the charge point ID
3. Backend creates a Stripe PaymentIntent with manual capture
4. Frontend displays the Stripe payment form
5. User enters payment details
6. Payment is authorized (but not captured)
7. Success message displays with payment intent details

## Customization

### Changing Payment Amount

Edit `app/api/create-payment-intent/route.ts`:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // Amount in cents ($50.00)
  // ...
});
```

### Styling

The project uses Tailwind CSS. Modify styles in:

- `app/globals.css` for global styles
- Component files for component-specific styles

## Environment Variables

| Variable                             | Description                     | Required |
| ------------------------------------ | ------------------------------- | -------- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (public) | Yes      |
| `STRIPE_SECRET_KEY`                  | Stripe secret key (private)     | Yes      |

## Security Notes

⚠️ **IMPORTANT:**

- Never commit `.env.local` to version control
- Keep your Stripe secret key secure
- Use test keys during development
- Switch to live keys only in production

## Production Deployment

1. Set environment variables in your hosting platform
2. Use production Stripe keys (starts with `pk_live_` and `sk_live_`)
3. Build the project:
   ```bash
   npm run build
   npm start
   ```

## Technologies

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Stripe](https://stripe.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
