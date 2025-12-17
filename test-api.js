const axios = require('axios');

async function test() {
    try {
        console.log('Testing GET /household...');
        const getRes = await axios.get('http://localhost:4000/household', {
            headers: { Authorization: 'Bearer DEV_TOKEN' }
        });
        console.log('GET Success:', getRes.data);

        console.log('Testing PATCH /household...');
        const patchRes = await axios.patch('http://localhost:4000/household', {
            budgetMode: 'SALARY',
            budgetConfig: { salaryDay: 25 }
        }, {
            headers: { Authorization: 'Bearer DEV_TOKEN' }
        });
        console.log('PATCH Success:', patchRes.data);
    } catch (e) {
        if (e.response) {
            console.error('API Error:', e.response.status, e.response.data);
        } else {
            console.error('Network/Other Error:', e.message);
        }
    }
}

test();
