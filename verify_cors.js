
async function test() {
    try {
        console.log('Testing OPTIONS /auth/me...');
        const res = await fetch('http://localhost:4000/auth/me', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'PUT',
                'Access-Control-Request-Headers': 'content-type,authorization'
            }
        });

        console.log('Status:', res.status);
        console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
        console.log('Access-Control-Allow-Methods:', res.headers.get('access-control-allow-methods'));
        console.log('Access-Control-Allow-Credentials:', res.headers.get('access-control-allow-credentials'));

    } catch (e) {
        console.error('Test Error:', e.message);
    }
}

test();
