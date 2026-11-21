import 'dotenv/config';
import { createFounderAccount, createNote, getSpaceStatus, redeemPartnerInvite } from '../src/server/db/store';

async function runSeed() {
  const status = await getSpaceStatus();
  if (status.initialized) {
    console.log(`Space already initialized (${status.userCount}/${status.maxUsers} users). Skipping seed.`);
    process.exit(0);
  }

  const founderPassword = process.env.SEED_FOUNDER_PASSWORD || 'BatCatLove2026!';
  const partnerPassword = process.env.SEED_PARTNER_PASSWORD || 'BowCatLove2026!';

  const { user: maya, inviteCode } = await createFounderAccount({
    name: 'Maya',
    email: 'maya@ourlittlespace.app',
    password: founderPassword,
    avatarPreset: 'bow-cat',
  });

  const leo = await redeemPartnerInvite({
    inviteCode,
    name: 'Leo',
    email: 'leo@ourlittlespace.app',
    password: partnerPassword,
    avatarPreset: 'bat-cat',
  });

  await createNote(maya.id, maya.spaceId, {
    content: 'Saved two seats by the window at our favorite bakery this morning. Got you the iced oat matcha.',
    tone: 'pink',
    sticker: 'love-cats',
    images: [],
  });

  await createNote(leo.id, leo.spaceId, {
    content: 'Walked home under the purple sunset and remembered we still need to pick a movie for tonight.',
    tone: 'lavender',
    sticker: 'cozy-moon',
    images: [],
  });

  await createNote(maya.id, maya.spaceId, {
    content: 'Reminder: bring your film camera for Saturday afternoon at the botanical conservatory!',
    tone: 'blue',
    sticker: 'pastel-flower',
    images: [],
  });

  console.log('Seeded Our Little Space with 2 partner accounts and 3 sample notes.');
  console.log(`Account 1: maya@ourlittlespace.app`);
  console.log(`Account 2: leo@ourlittlespace.app`);
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
