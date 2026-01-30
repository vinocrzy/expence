import { useEffect } from 'react';
import { transactionsDB, accountsDB } from '../lib/pouchdb';
import { sharedDataService, getHouseholdId } from '../lib/localdb-services';

export function useHouseholdPublisher(isOwner: boolean) {
  useEffect(() => {
    if (!isOwner) return;

    // Initial publish
    publish();

    // Watch for changes
    const txChanges = transactionsDB.changes({
      since: 'now',
      live: true,
      include_docs: false
    }).on('change', () => {
       console.log('Transaction changed, republishing shared data...');
       // Debounce?
       publish();
    });

    const accChanges = accountsDB.changes({
      since: 'now',
      live: true,
      include_docs: false
    }).on('change', () => {
       console.log('Account changed, republishing shared data...');
       publish();
    });

    return () => {
      txChanges.cancel();
      accChanges.cancel();
    };
  }, [isOwner]);

  const publish = async () => {
    try {
        const hid = await getHouseholdId();
        await sharedDataService.publishSnapshot(hid);
    } catch (e) {
        console.error('Failed to publish shared snapshot', e);
    }
  };
}
