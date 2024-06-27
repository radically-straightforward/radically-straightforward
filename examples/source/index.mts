import fs from "node:fs/promises";

/**
 * **Sources**
 *
 * - **First names:** https://www.ssa.gov/oact/babynames/decades/century.html
 * - **Last names:** https://www.thoughtco.com/most-common-us-surnames-1422656
 */
export function name(): string {
  const firstNames = [
    "Leandro",
    "Scott",
    "Ali",
    "Louie",
    "Abigail",
    "James",
    "Mary",
    "Michael",
    "Patricia",
    "Robert",
    "Jennifer",
    "John",
    "David",
    "Elizabeth",
    "William",
    "Barbara",
    "Richard",
    "Susan",
    "Joseph",
    "Jessica",
    "Thomas",
    "Karen",
    "Christopher",
    "Sarah",
    "Charles",
    "Lisa",
    "Daniel",
    "Nancy",
    "Matthew",
    "Sandra",
    "Anthony",
    "Betty",
    "Mark",
    "Ashley",
    "Donald",
    "Emily",
    "Steven",
    "Kimberly",
    "Andrew",
    "Margaret",
    "Paul",
    "Donna",
    "Joshua",
    "Michelle",
    "Kenneth",
    "Carol",
    "Kevin",
    "Amanda",
    "Brian",
    "Melissa",
    "Timothy",
    "Deborah",
    "Ronald",
    "Stephanie",
    "George",
    "Rebecca",
    "Jason",
    "Sharon",
    "Edward",
    "Laura",
    "Jeffrey",
    "Cynthia",
    "Ryan",
    "Dorothy",
    "Jacob",
    "Amy",
    "Nicholas",
    "Kathleen",
    "Gary",
    "Angela",
    "Eric",
    "Shirley",
    "Jonathan",
    "Emma",
    "Stephen",
    "Brenda",
    "Larry",
    "Pamela",
    "Justin",
    "Nicole",
    "Anna",
    "Brandon",
    "Samantha",
    "Benjamin",
    "Katherine",
    "Samuel",
    "Christine",
    "Gregory",
    "Debra",
    "Alexander",
    "Rachel",
    "Patrick",
    "Carolyn",
    "Frank",
    "Janet",
    "Raymond",
    "Maria",
    "Jack",
    "Olivia",
    "Dennis",
    "Heather",
    "Jerry",
    "Helen",
    "Tyler",
    "Catherine",
    "Aaron",
    "Diane",
    "Jose",
    "Julie",
    "Adam",
    "Victoria",
    "Nathan",
    "Joyce",
    "Henry",
    "Lauren",
    "Zachary",
    "Kelly",
    "Douglas",
    "Christina",
    "Peter",
    "Ruth",
    "Kyle",
    "Joan",
    "Noah",
    "Virginia",
    "Ethan",
    "Judith",
    "Jeremy",
    "Evelyn",
    "Christian",
    "Hannah",
    "Walter",
    "Andrea",
    "Keith",
    "Megan",
    "Austin",
    "Cheryl",
    "Roger",
    "Jacqueline",
    "Terry",
    "Madison",
    "Sean",
    "Teresa",
    "Gerald",
    "Carl",
    "Sophia",
    "Dylan",
    "Martha",
    "Harold",
    "Sara",
    "Jordan",
    "Gloria",
    "Jesse",
    "Janice",
    "Bryan",
    "Kathryn",
    "Lawrence",
    "Ann",
    "Arthur",
    "Isabella",
    "Gabriel",
    "Judy",
    "Bruce",
    "Charlotte",
    "Logan",
    "Julia",
    "Billy",
    "Grace",
    "Joe",
    "Amber",
    "Alan",
    "Alice",
    "Juan",
    "Jean",
    "Elijah",
    "Denise",
    "Willie",
    "Frances",
    "Albert",
    "Danielle",
    "Wayne",
    "Marilyn",
    "Randy",
    "Natalie",
    "Mason",
    "Beverly",
    "Vincent",
    "Diana",
    "Liam",
    "Brittany",
    "Roy",
    "Theresa",
    "Bobby",
    "Kayla",
    "Caleb",
    "Alexis",
    "Bradley",
    "Doris",
    "Russell",
    "Lori",
    "Lucas",
    "Tiffany",
  ];
  const lastNames = [
    "Facchinetti",
    "Smith",
    "Madooei",
    "Renner",
    "Wall",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzales",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Torres",
    "Nguyen",
    "Hill",
    "Flores",
    "Green",
    "Adams",
    "Nelson",
    "Baker",
    "Hall",
    "Rivera",
    "Campbell",
    "Mitchell",
    "Carter",
    "Roberts",
    "Gomez",
    "Phillips",
    "Evans",
    "Turner",
    "Diaz",
    "Parker",
    "Cruz",
    "Edwards",
    "Collins",
    "Reyes",
    "Stewart",
    "Morris",
    "Morales",
    "Murphy",
    "Cook",
    "Rogers",
    "Gutierrez",
    "Ortiz",
    "Morgan",
    "Cooper",
    "Peterson",
    "Bailey",
    "Reed",
    "Kelly",
    "Howard",
    "Ramos",
    "Kim",
    "Cox",
    "Ward",
    "Richardson",
    "Watson",
    "Brooks",
    "Chavez",
    "Wood",
    "James",
    "Bennet",
    "Gray",
    "Mendoza",
    "Ruiz",
    "Hughes",
    "Price",
    "Alvarez",
    "Castillo",
    "Sanders",
    "Patel",
    "Myers",
    "Long",
    "Ross",
    "Foster",
    "Jimenez",
  ];
  return (
    firstNames[Math.floor(Math.random() * firstNames.length)] +
    " " +
    lastNames[Math.floor(Math.random() * lastNames.length)]
  );
}

export function text({
  model = textModel,
  length = 10,
}: {
  model?: {
    [predecessor: string]: {
      [successor: string]: {
        count: number;
        percentile: number;
      };
    };
  };
  length?: number;
} = {}): string {
  const paragraphs = new Array<string>();
  const paragraphsLength = length === 0 ? 1 : length;
  while (paragraphs.length < paragraphsLength) {
    const sentences = new Array<string>();
    const sentencesLength =
      length === 0 ? 1 : 1 + Math.floor(Math.random() * 6);
    while (sentences.length < sentencesLength) {
      const words =
        Object.keys(model)[
          Math.floor(Math.random() * Object.keys(model).length)
        ].split(" ");
      const wordsLength =
        length === 0
          ? 1 + Math.floor(Math.random() * 7)
          : 5 + Math.floor(Math.random() * 10);
      addWord: while (words.length < wordsLength) {
        for (
          let predecessorLength = 2;
          1 <= predecessorLength;
          predecessorLength--
        ) {
          const predecessor = words.slice(-predecessorLength).join(" ");
          if (model[predecessor] === undefined) continue;
          const successorSelector = Math.random();
          for (const successor of Object.keys(model[predecessor]))
            if (successorSelector <= model[predecessor][successor].percentile) {
              words.push(successor);
              continue addWord;
            }
        }
        while (true) {
          const word =
            Object.keys(model)[
              Math.floor(Math.random() * Object.keys(model).length)
            ];
          if (word.includes(" ")) continue;
          words.push(word);
          continue addWord;
        }
      }
      sentences.push(
        words.join(" ").replace(/./, (character) => character.toUpperCase()) +
          (Math.random() < 0.9
            ? length === 0
              ? ""
              : "."
            : Math.random() < 0.8
              ? "?"
              : "!"),
      );
    }
    paragraphs.push(sentences.join(" "));
  }
  return paragraphs.join("\n\n");
}
const textModel = JSON.parse(
  await fs.readFile(new URL("../text/model.json", import.meta.url), "utf-8"),
);
