export function generateRejection(reason: string): string {
  return `Thank you for taking the time to respond to our inquiry.

After careful consideration, we've decided to move forward with other options that better align with our event needs.

${reason}

We appreciate your time and will keep your information on file for future events.

Best regards,
Event Planning Team`
}

export function generateNegotiation(currentQuote: number, targetBudget: number): string {
  const difference = currentQuote - targetBudget
  const percentOver = Math.round((difference / targetBudget) * 100)

  return `Thank you for your detailed quote of $${currentQuote.toLocaleString()}.

We're very interested in working with you, but your quote is approximately ${percentOver}% above our allocated budget of $${targetBudget.toLocaleString()}.

Would you be open to:
1. Adjusting your pricing to better fit our budget?
2. Offering a scaled-down package or removing certain items?
3. Any other creative solutions that could make this work?

We value your services and would love to find a way to collaborate on this event.

Best regards,
Event Planning Team`
}

export function generateConfirmation(details: {
  vendorName: string
  quote: number
  dates: string[]
}): string {
  return `Thank you for confirming your availability and providing pricing details.

We're pleased to inform you that your quote of $${details.quote.toLocaleString()} fits within our budget, and your availability aligns with our event timeline.

Next Steps:
- We're currently finalizing our vendor selection
- We expect to make a decision within the next 3-5 business days
- If selected, we'll reach out to discuss contract terms and deposit requirements

Available dates that work for us: ${details.dates.join(', ')}

We'll be in touch soon!

Best regards,
Event Planning Team`
}
