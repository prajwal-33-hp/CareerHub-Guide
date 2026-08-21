export const articles = [
  {
    id: 'a1', slug: 'how-to-become-a-full-stack-developer', title: 'How to Become a Full Stack Developer',
    excerpt: 'A practical roadmap covering the skills, projects, and order of learning that actually gets you hired.',
    readTime: '8 min read', category: 'Career Roadmap',
    body: [
      'Becoming a full stack developer is less about memorizing every framework and more about understanding how a request travels from a browser to a database and back. Start by getting comfortable with one frontend framework and one backend runtime — trying to learn everything at once slows most beginners down rather than speeding them up.',
      'A practical order that works for most people: HTML, CSS, and JavaScript fundamentals first, then a frontend framework like React, then a backend runtime like Node.js with Express, then a database like MongoDB or PostgreSQL. Once those four pieces click together in a single project, the rest of the ecosystem (testing, deployment, auth) becomes much easier to pick up.',
      'The single highest-leverage thing you can do is build one complete project end to end — not a tutorial clone, but something with your own scope, deployed somewhere real. Recruiters and interviewers consistently respond better to one finished, deployed project than five half-built ones.',
    ],
  },
  {
    id: 'a2', slug: 'react-developer-roadmap', title: 'React Developer Roadmap',
    excerpt: 'From JSX fundamentals to state management and performance — what to learn and in what order.',
    readTime: '6 min read', category: 'Frontend',
    body: [
      'Start with JSX and components — understanding that a component is just a function that returns UI is the single most important mental model in React. From there, learn props (data flowing down) and state (data that changes over time) before touching anything else.',
      'Once components and state feel natural, move to hooks: useState and useEffect cover the vast majority of real-world needs. Resist the urge to learn every hook at once — useContext and useReducer make much more sense once you have hit the specific problems they solve.',
      'After the fundamentals, focus on: routing (React Router), forms (React Hook Form), and talking to APIs (Axios or fetch). Performance topics like memoization and code splitting matter, but only after you have shipped something that actually works — premature optimization here just slows you down.',
    ],
  },
  {
    id: 'a3', slug: 'how-to-prepare-for-technical-interviews', title: 'How to Prepare for Technical Interviews',
    excerpt: 'What interviewers are actually evaluating, and how to practice for it without burning out.',
    readTime: '7 min read', category: 'Interview Prep',
    body: [
      'Technical interviews are rarely just testing whether you can solve a puzzle — they are testing how you think out loud, how you handle being stuck, and whether you can communicate a plan before diving into code. Practicing silently is far less useful than practicing while narrating your reasoning.',
      'A sustainable prep schedule beats a cramming binge. Spending 45 focused minutes a day for three weeks builds far more durable pattern recognition than a single 12-hour weekend session — and it is much easier to keep up alongside coursework or a job.',
      'Beyond the coding round, prepare specific stories for behavioral questions using a simple structure: situation, the action you took, and the measurable result. Vague answers are the most common reason otherwise-strong candidates struggle in this part of the process.',
    ],
  },
  {
    id: 'a4', slug: 'node-js-developer-roadmap', title: 'Node.js Developer Roadmap',
    excerpt: 'Everything you need to go from writing scripts to building production-ready APIs.',
    readTime: '6 min read', category: 'Backend',
    body: [
      'Node.js lets you run JavaScript outside the browser, which means your frontend and backend skills reinforce each other. Start with the core modules (fs, http, path) before reaching for Express, so the framework feels like a convenience layer rather than a black box.',
      'Once comfortable with Express and building REST routes, add a database. MongoDB with Mongoose pairs naturally with JavaScript\'s object-based data, while PostgreSQL forces you to think more relationally — both are worth understanding.',
      'From there, layer in authentication (JWT and password hashing with bcrypt), input validation, and error handling middleware. These four things separate a toy backend from something you would actually trust in production.',
    ],
  },
  {
    id: 'a5', slug: 'best-skills-for-software-developers', title: 'Best Skills for Software Developers in 2026',
    excerpt: 'A grounded look at which technical and non-technical skills actually move the needle on hiring.',
    readTime: '5 min read', category: 'Career Roadmap',
    body: [
      'Technical breadth matters less than depth in one stack plus fluency in the fundamentals: data structures, HTTP, databases, and version control. Hiring managers consistently say they would rather see someone who deeply understands one stack than someone with surface familiarity across ten.',
      'Non-technical skills are underrated. The ability to write a clear pull request description, ask a well-scoped question, and explain a technical tradeoff to a non-technical stakeholder often determines who gets promoted faster than raw coding speed.',
      'Finally, the skill of shipping matters more than the skill of planning. A developer who ships a working, imperfect feature and iterates will usually outperform one who spends weeks designing the "perfect" architecture before writing any code.',
    ],
  },
]

export const interviewTopics = [
  {
    id: 'react', title: 'React Interview Questions', slug: 'react-interview-questions',
    questions: [
      { q: 'What is the difference between state and props?', a: 'Props are read-only data passed into a component from its parent, while state is data a component manages and can update internally. Props flow one way (parent to child); state changes trigger the component that owns it to re-render.' },
      { q: 'What problem do React hooks solve?', a: 'Hooks let function components use state and other React features without writing a class. Before hooks, stateful logic often had to be shared through patterns like higher-order components or render props, which made code harder to follow — hooks make that logic reusable and easier to read.' },
      { q: 'When would you use useEffect versus useMemo?', a: 'useEffect handles side effects — things that reach outside the component, like fetching data or subscribing to an event. useMemo is for caching an expensive calculation so it does not re-run on every render. They solve different problems even though both take a dependency array.' },
      { q: 'What is the virtual DOM and why does it matter?', a: 'The virtual DOM is a lightweight in-memory representation of the actual DOM. React compares the previous and new virtual DOM trees and only applies the minimal set of real DOM changes needed, which is faster than re-rendering the whole page on every update.' },
    ],
  },
  {
    id: 'javascript', title: 'JavaScript Interview Questions', slug: 'javascript-interview-questions',
    questions: [
      { q: 'What is the difference between == and ===?', a: '== compares values after converting them to a common type if they differ, which can produce surprising results. === compares both value and type without conversion, which is why it is generally the safer default.' },
      { q: 'Explain closures with a simple example.', a: 'A closure is a function that remembers the variables from the scope it was created in, even after that outer function has finished running. This is commonly used to create private variables or counters that persist between calls.' },
      { q: 'What is the event loop?', a: 'The event loop is what lets JavaScript, a single-threaded language, handle asynchronous operations. It continuously checks whether the call stack is empty, and if so, moves the next task from the queue (like a resolved promise or a timer callback) onto the stack to run.' },
    ],
  },
  {
    id: 'nodejs', title: 'Node.js Interview Questions', slug: 'nodejs-interview-questions',
    questions: [
      { q: 'Why is Node.js often described as non-blocking?', a: 'Node.js uses an event-driven, non-blocking I/O model, meaning operations like reading a file or querying a database do not halt the entire program while waiting for a response — the program continues running other code and handles the result via a callback, promise, or async/await once it is ready.' },
      { q: 'What is middleware in Express?', a: 'Middleware is a function that runs between receiving a request and sending a response. It can modify the request/response objects, end the request, or pass control to the next middleware — commonly used for things like authentication checks, logging, or parsing request bodies.' },
    ],
  },
  {
    id: 'mongodb', title: 'MongoDB Interview Questions', slug: 'mongodb-interview-questions',
    questions: [
      { q: 'How does MongoDB differ from a relational database?', a: 'MongoDB stores data as flexible, JSON-like documents rather than rows in fixed tables, so related data can often be nested in a single document instead of split across joined tables. This trades some of the strict structure of relational databases for flexibility and often faster reads for document-shaped data.' },
      { q: 'What is an index and why does it matter?', a: 'An index is a data structure that lets MongoDB find documents matching a query without scanning every document in a collection. Without the right indexes, queries on large collections can become significantly slower as data grows.' },
    ],
  },
  {
    id: 'fullstack', title: 'Full-Stack Interview Questions', slug: 'fullstack-interview-questions',
    questions: [
      { q: 'Walk through what happens when a user submits a login form.', a: 'The frontend sends the credentials to a backend API endpoint, typically over HTTPS. The backend looks up the user, compares the submitted password against the stored hash (never the plain password), and if it matches, issues a token (like a JWT) that the frontend stores and sends with future requests to prove the user is authenticated.' },
      { q: 'How would you handle an expired auth token gracefully?', a: 'Typically by catching 401 responses in a centralized place, like an Axios interceptor, then either silently refreshing the token if a refresh mechanism exists, or redirecting the user to the login page with a clear message rather than showing a broken screen.' },
    ],
  },
]
