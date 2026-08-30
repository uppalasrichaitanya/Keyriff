export const QUOTES = [
  { text: "The only way to do great work is to love what you do.", source: "Steve Jobs" },
  { text: "Simplicity is the ultimate sophistication.", source: "Leonardo da Vinci" },
  { text: "Whether you think you can or you think you can't, you're right.", source: "Henry Ford" },
  { text: "It does not matter how slowly you go as long as you do not stop.", source: "Confucius" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill" },
  { text: "The best way to predict the future is to invent it.", source: "Alan Kay" },
  { text: "Talk is cheap. Show me the code.", source: "Linus Torvalds" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", source: "Harold Abelson" },
  { text: "Premature optimization is the root of all evil in programming.", source: "Donald Knuth" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", source: "Martin Fowler" },
  { text: "The most disastrous thing that you can ever learn is your first programming language.", source: "Alan Kay" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", source: "Antoine de Saint-Exupery" },
  { text: "Weeks of coding can save you hours of planning.", source: "Unknown" },
  { text: "First, solve the problem. Then, write the code.", source: "John Johnson" },
  { text: "Experience is simply the name we give our mistakes.", source: "Oscar Wilde" },
  { text: "The journey of a thousand miles begins with a single step.", source: "Lao Tzu" },
  { text: "What we know is a drop, what we don't know is an ocean.", source: "Isaac Newton" },
  { text: "An investment in knowledge pays the best interest.", source: "Benjamin Franklin" },
  { text: "I have not failed. I've just found ten thousand ways that won't work.", source: "Thomas Edison" },
  { text: "The secret of getting ahead is getting started.", source: "Mark Twain" },
  { text: "It always seems impossible until it's done.", source: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", source: "Sam Levenson" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", source: "Unknown" },
  { text: "Dream big and dare to fail.", source: "Norman Vaughan" },
  { text: "You miss one hundred percent of the shots you don't take.", source: "Wayne Gretzky" },
  { text: "In the middle of difficulty lies opportunity.", source: "Albert Einstein" },
  { text: "Creativity is intelligence having fun.", source: "Albert Einstein" },
  { text: "Everything you can imagine is real.", source: "Pablo Picasso" },
  { text: "The purpose of our lives is to be happy.", source: "Dalai Lama" },
  { text: "Get busy living or get busy dying.", source: "Stephen King" },
  { text: "Life is what happens when you're busy making other plans.", source: "John Lennon" },
  { text: "Be yourself; everyone else is already taken.", source: "Oscar Wilde" },
  { text: "So many books, so little time.", source: "Frank Zappa" },
  { text: "A room without books is like a body without a soul.", source: "Marcus Tullius Cicero" },
  { text: "There is no friend as loyal as a book.", source: "Ernest Hemingway" },
  { text: "The man who does not read has no advantage over the man who cannot read.", source: "Mark Twain" },
  { text: "Typing is thinking made visible, each keystroke a small decision made at speed.", source: "Unknown" },
  { text: "Speed is a byproduct of accuracy; chase the letters and the pace will follow you home.", source: "Unknown" },
  { text: "Rhythm beats rush every time, find the cadence and let the words arrive on their own.", source: "Unknown" },
  { text: "A smooth sea never made a skilled sailor; likewise, easy texts never made a fast typist.", source: "Franklin D. Roosevelt" },
  { text: "Practice does not make perfect, only perfect practice makes perfect.", source: "Vince Lombardi" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", source: "Aristotle" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", source: "Ralph Waldo Emerson" },
  { text: "Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did do.", source: "Mark Twain" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", source: "Chinese Proverb" },
  { text: "Fall seven times, stand up eight.", source: "Japanese Proverb" },
  { text: "The bamboo that bends is stronger than the oak that resists.", source: "Japanese Proverb" },
  { text: "Knowledge speaks, but wisdom listens.", source: "Jimi Hendrix" },
  { text: "Stay hungry, stay foolish.", source: "Whole Earth Catalog" },
  { text: "Simplicity is the keynote of all true elegance.", source: "Coco Chanel" },
  { text: "Less, but better.", source: "Dieter Rams" },
  { text: "Design is not just what it looks like and feels like. Design is how it works.", source: "Steve Jobs" },
  { text: "Content is king, but context is God.", source: "Gary Vaynerchuk" },
  { text: "If you wish to make an apple pie from scratch, you must first invent the universe.", source: "Carl Sagan" },
  { text: "Somewhere, something incredible is waiting to be known.", source: "Carl Sagan" },
  { text: "The cosmos is within us; we are made of star stuff.", source: "Carl Sagan" },
  { text: "Look again at that dot. That's here. That's home. That's us.", source: "Carl Sagan" },
]

const a = new Uint32Array(1)

/* unbiased crypto random index (matches words.js) */
function rand(n) {
  const limit = Math.floor(0x100000000 / n) * n
  let v = 0
  do {
    crypto.getRandomValues(a)
    v = a[0]
  } while (v >= limit)
  return v % n
}

export function sampleQuote() {
  return QUOTES[rand(QUOTES.length)]
}
