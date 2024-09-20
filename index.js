require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    res.render('index.ejs');
});

app.get('/subscribe', async (req, res) => {
    const plan = req.query.plan;

    if (!plan) {
        return res.send('Subscription plan not found');
    }

    let priceId;
    let mode;

    switch (plan.toLowerCase()) {
        case 'monthlybasic':
            priceId = 'price_1Q0cn02K1kbzAVkkSg5q5U3E';
            mode = 'subscription';
            break;

        case 'onetimebasic':
            priceId = 'price_1Q0cns2K1kbzAVkkjEVszyPP';
            mode = 'payment';
            break;

        case 'monthlypremium':
            priceId = 'price_1Q0cpG2K1kbzAVkkTuOaSjDc';
            mode = 'subscription';
            break;

        case 'onetimepremium':
            priceId = 'price_1Q0cpz2K1kbzAVkkOD4C6o9U';
            mode = 'payment';
            break;

        default:
            return res.send('Subscription plan not found');
    }

    const session = await stripe.checkout.sessions.create({
        mode: mode,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            }
        ],
        success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`,
    });

    console.log(session);
    res.redirect(session.url);
});

app.get('/success', async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['subscription', 'subscription.plan.product'] });

    console.log(JSON.stringify(session));
    res.send('Subscribed successfully');
});

app.get('/cancel', (req, res) => {
    res.redirect('/');
});

app.get('/customers/:customerId', async(req, res) =>{
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: req.params.customerId,
        return_url: `${process.env.BASE_URL}/`
    })

    res.redirect(portalSession.url);
    
})


app.post('/webhook', express.raw({type:'application/json'}), (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try{
      event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET_KEY);
    } catch(err){
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    switch(event.type){
        case'checkout.session.complete':
            console.log('New Subscription started!');
            console.log(event.data);
            break;
          
        case 'invoice.paid':
            console.log('Invoice paid');
            console.log(event.data);
            break;      
            
        case 'invoice.payment_failed':
            console.log('Invoice payment failed!');
            console.log(event.data);
            break;

        case 'customer.subscription.updated':
            console.log('Subscription updated');
            console.log(event.data);      
            break;
        
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded =event.data.object;
            break; 

        default:
            console.log(`Unhandled event type ${event.type}`);
 
    }

    response.send();
})


app.listen(3000, () => console.log('Server started on port 3000'));
