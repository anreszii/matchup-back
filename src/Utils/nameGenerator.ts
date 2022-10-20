import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator'
export function generateName(length: number) {
  return uniqueNamesGenerator({
    dictionaries: [colors, adjectives, animals],
    length,
    style: 'capital',
    seed: 'testSeed',
    separator: '',
  }) // RedBigDonkey
}

export function generateGuildName() {
  return uniqueNamesGenerator({
    dictionaries: [colors, adjectives, animals],
    length: 1,
    seed: 'testGuildSeed',
    separator: '_',
  }) //red_big_donkey
}
