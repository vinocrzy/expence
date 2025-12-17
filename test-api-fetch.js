
async function test() {
    try {
        console.log('Testing GET /household...');
        const getRes = await fetch('http://localhost:4000/household', {
            headers: { 'Authorization': 'Bearer DEV_TOKEN' }
        });
        if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
        console.log('GET Success:', await getRes.json());

        console.log('Testing PATCH /household...');
        const patchRes = await fetch('http://localhost:4000/household', {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer DEV_TOKEN',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                budgetMode: 'SALARY',
                budgetConfig: { salaryDay: 25 }
            })
        });
        if (!patchRes.ok) throw new Error(`PATCH failed: ${patchRes.status} ${await patchRes.text()}`);
        console.log('PATCH Success:', await patchRes.json());
    } catch (e) {
        console.error('Test Error:', e.message);
    }
}

test();
