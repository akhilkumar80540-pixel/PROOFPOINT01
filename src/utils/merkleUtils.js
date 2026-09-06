import { MerkleTree } from 'merkletreejs';
import { keccak256, toUtf8Bytes, getBytes } from 'ethers';

const hashFn = (data) => getBytes(keccak256(data));

export function getLeafHash(attendee) {
  const rawData = `${attendee.proofId || attendee.id}-${attendee.rollNumber || ''}-${attendee.eventId || ''}-${attendee.timestamp || ''}`;
  return getBytes(keccak256(toUtf8Bytes(rawData)));
}

export function buildMerkleTree(attendees) {
  if (!attendees || attendees.length === 0) return null;

  const leaves = attendees.map(getLeafHash);
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
  return { tree, leaves };
}

export function generateProof(attendees, targetAttendee) {
  const treeData = buildMerkleTree(attendees);
  if (!treeData) return null;

  const targetLeaf = getLeafHash(targetAttendee);
  const proof = treeData.tree.getHexProof(targetLeaf);
  return {
    proof,
    leaf: keccak256(toUtf8Bytes(`${targetAttendee.proofId || targetAttendee.id}-${targetAttendee.rollNumber || ''}-${targetAttendee.eventId || ''}-${targetAttendee.timestamp || ''}`)),
    root: treeData.tree.getHexRoot()
  };
}