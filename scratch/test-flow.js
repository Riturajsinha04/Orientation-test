import http from 'http';

const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:5001/api${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function runAcceptanceTest() {
  console.log('=== STARTING SECTION 29 FINAL ACCEPTANCE TEST ===\n');

  // Step 0: Reset session for clean environment
  console.log('0. Resetting session...');
  const resetRes = await request('/session/reset', 'POST');
  console.log('Reset response:', resetRes.body.message);

  // Step 1: Register Rahul Sharma (9876543210)
  console.log('\nStep 1: Registering Rahul Sharma (9876543210)...');
  const reg1 = await request('/tokens', 'POST', {
    studentName: 'Rahul Sharma',
    mobile: '9876543210',
    course: 'B.Tech Computer Science',
  });
  console.log(`Generated Token: ${reg1.body.token.token} (Expected: A-001)`);
  if (reg1.body.token.token !== 'A-001') throw new Error('Token 1 failed!');

  // Step 2: Register second student Priya Singh (9876543211)
  console.log('\nStep 2: Registering Priya Singh (9876543211)...');
  const reg2 = await request('/tokens', 'POST', {
    studentName: 'Priya Singh',
    mobile: '9876543211',
    course: 'B.Tech IT',
  });
  console.log(`Generated Token: ${reg2.body.token.token} (Expected: A-002)`);
  if (reg2.body.token.token !== 'A-002') throw new Error('Token 2 failed!');

  // Register third student Aman Verma (9876543212) for capacity testing
  console.log('Registering Aman Verma (9876543212)...');
  const reg3 = await request('/tokens', 'POST', {
    studentName: 'Aman Verma',
    mobile: '9876543212',
    course: 'Data Science',
  });
  console.log(`Generated Token: ${reg3.body.token.token} (Expected: A-003)`);

  // Step 3: Check Smartboard waiting queue
  console.log('\nStep 3: Checking Smartboard display initial state...');
  const current1 = await request('/tokens/current');
  console.log('Next tokens in line:', current1.body.nextTokens);
  console.log('Students waiting count:', current1.body.waitingCount);

  // Step 4 & 5: Management calls next student to Table 1
  console.log('\nStep 4 & 5: Management calls next student to Table 1...');
  const call1 = await request('/tokens/call-next', 'POST', { tableNumber: 1 });
  console.log(`Called token ${call1.body.token.token} to Table ${call1.body.token.tableNumber}`);

  const current2 = await request('/tokens/current');
  console.log(`Smartboard NOW SERVING: ${current2.body.currentToken.token} at Table ${current2.body.currentToken.tableNumber}`);

  // Step 6: Management calls second student to Table 1
  console.log('\nStep 6: Management calls second student to Table 1...');
  const call2 = await request('/tokens/call-next', 'POST', { tableNumber: 1 });
  console.log(`Called token ${call2.body.token.token} to Table ${call2.body.token.tableNumber}`);

  const stats1 = await request('/tokens/stats');
  const table1Tokens = stats1.body.stats.tables[1].map(t => t.token);
  console.log('Table 1 current students:', table1Tokens);
  if (table1Tokens.length !== 2) throw new Error('Table 1 should contain 2 students!');

  // Step 7: Trying to add a third student to Table 1 MUST fail
  console.log('\nStep 7: Attempting to call a 3rd student to Table 1 (Expect Capacity Failure)...');
  const call3Fail = await request('/tokens/call-next', 'POST', { tableNumber: 1 });
  console.log(`Response Status: ${call3Fail.status}, Message: "${call3Fail.body.message}"`);
  if (call3Fail.status !== 400 || !call3Fail.body.message.includes('FULL')) {
    throw new Error('Table capacity check failed! Adding 3rd student should have been rejected.');
  }
  console.log('✅ TABLE FULL capacity enforcement succeeded!');

  // Step 8: Management completes A-001
  console.log('\nStep 8: Completing Token A-001...');
  const comp1 = await request('/tokens/A-001/status', 'PATCH', { status: 'COMPLETED' });
  console.log(`Token A-001 status: ${comp1.body.token.status}`);

  const stats2 = await request('/tokens/stats');
  console.log('Table 1 active students after completion:', stats2.body.stats.tables[1].map(t => t.token));

  // Step 9: Management calls next student now that space opened up
  console.log('\nStep 9: Calling next student to Table 1 now that capacity freed up...');
  const call3Success = await request('/tokens/call-next', 'POST', { tableNumber: 1 });
  console.log(`Successfully called token ${call3Success.body.token.token} to Table 1!`);

  // Step 10: State persistence
  console.log('\nStep 10: Verifying final state from MongoDB source of truth...');
  const finalTokens = await request('/tokens');
  console.log('Final Tokens Summary:');
  finalTokens.body.tokens.forEach(t => {
    console.log(`  - ${t.token}: ${t.studentName} | Status: ${t.status} | Table: ${t.tableNumber || 'N/A'}`);
  });

  console.log('\n🎉 ALL ACCEPTANCE TEST STEPS PASSED PERFECTLY!');
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ Acceptance Test Failed:', err);
  process.exit(1);
});
