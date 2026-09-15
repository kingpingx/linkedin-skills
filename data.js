// The week's plan. Edit this file to plan a new week; your in-browser edits
// are saved separately (localStorage) and keyed by week.start.
window.PLAN = {
  week: {
    start: "2026-09-14",
    label: "Mon 14 – Sun 20 Sep 2026",
    timezone: "IST",
  },

  days: [
    {
      id: "mon",
      date: "2026-09-14",
      kind: "comment",
      title: "Commenting day",
      commentTarget: 10,
      whom: ".NET educators (e.g. Milan Jovanović, Nick Chapsas, Steve \"Ardalis\" Smith) and peer engineers with 1k–10k followers",
      how: "Answer their question with a real example from your work",
    },
    {
      id: "tue",
      date: "2026-09-15",
      kind: "post",
      time: "08:00",
      pillar: "Teaching",
      format: "Text + image",
      formula: "F15 Explain-to-Kids",
      goal: "Saves",
      angle: "async/await explained with a restaurant",
      commentTarget: 10,
      whom: "People posting about async, performance, or ASP.NET Core",
      how: "Add one concrete detail or gotcha they missed",
      text: `async/await in C#, explained with a restaurant.

For juniors, and for seniors who still mix it up.

🍽️ The thread = a waiter.

🍳 The I/O call (database, HTTP, file) = the kitchen cooking an order.

⏳ await = the waiter hands the order to the kitchen and goes to serve other tables.

🔔 The Task = the ticket. When the food is ready, a waiter (maybe a different one) picks it up and finishes the order.

🚫 .Result or .Wait() = the waiter stands at the kitchen door until the food is done. Every other table waits too.

💥 Do that under load in ASP.NET Core and you run out of waiters. That's thread pool starvation.

🧊 async void = an order with no ticket. If the kitchen burns it, nobody finds out until the restaurant is on fire. Keep it for event handlers.

🏃 Task.WhenAll = sending three orders to the kitchen at once instead of one after another.

🔪 CPU-heavy work = the waiter chopping onions at the table. async doesn't speed that up, and Task.Run inside a request just borrows another waiter.

Next time an API freezes under load, search the codebase for .Result first.

What analogy finally made async click for you?

#dotnet #csharp`,
    },
    {
      id: "wed",
      date: "2026-09-16",
      kind: "post",
      time: "09:30",
      pillar: "Opinion with facts",
      format: "Text + image",
      formula: "F10 Contrarian + Receipts",
      image: "https://api.pixfaro.com/i/usr_5b55380581e3b0a16b1e/img_9db8ffed17a87a569128.png",
      goal: "Comments",
      angle: "\"Angular is dead\" since 2016, against what actually shipped",
      commentTarget: 10,
      whom: "Angular voices (e.g. Deborah Kurata, Angular GDEs) and frontend peers",
      how: "Share how your team actually uses the feature they're discussing",
      text: `People have been calling Angular dead since 2016.

Sep 2016. Angular 2 ships as a full rewrite of AngularJS. Teams with big AngularJS apps feel abandoned, and plenty of them move to React.

Dec 2021. AngularJS long-term support ends. Anyone still on it now has a real deadline.

Jun 2022. Angular 14 brings standalone components. Not everything needs an NgModule anymore.

May 2023. Angular 16 introduces Signals, and change detection starts getting simpler.

Nov 2023. Angular 17 adds the new @if and @for control flow, deferrable views, and a new home at angular.dev.

Nov 2024. Angular 19 makes standalone the default.

A new major version every 6 months, for 8 years straight.

What died was the 2016 version of Angular, with NgModules everywhere and a learning curve that scared juniors off. What ships today reads a lot like the rest of modern TypeScript.

I've watched most of this timeline from inside one codebase. The video analytics platform I work on went from Angular 12 to 18 one upgrade at a time, along with the charting library I built for it and the shared component libraries we publish to npm.

Now the same "it's over" talk is about developers and AI.

I don't think we need to fear it. The real risk is using it just to get answers. Used well, it can help us learn faster.

A few habits that help:

→ When AI fixes a bug, ask it why the fix works.

→ Read every line it writes before you ship it.

→ Try the next change yourself first, then ask AI to review it.

It's the same idea as upgrading a framework one version at a time. Each small step teaches you something the next one builds on. If AI takes you straight to the answer every time, you skip those steps, and the gaps show up later.

What's the most confident "X is dead" prediction you've seen in tech?

#Angular #AI`,
    },
    {
      id: "thu",
      date: "2026-09-17",
      kind: "post",
      time: "08:00",
      pillar: "Community",
      format: "Text",
      formula: "F14 Named Gratitude",
      goal: "Reposts",
      angle: "Thank-you to .NET open-source maintainers",
      note: "When you post it, @-mention the maintainers in LinkedIn's post editor if they're on LinkedIn. Keep only the libraries you actually use.",
      commentTarget: 10,
      whom: "Open-source maintainers and DevOps people posting about Docker or GitHub Actions",
      how: "Thank them for something specific, or add a tip",
      text: `To Nicholas Blumhardt, Marc Gravell, Nick Craver, Brad Wilson, and Jeremy Skinner: thank you for the code I didn't have to write.

Nicholas created Serilog, and structured logging stopped being something only big companies did. [When a batch job fails, the first thing I open is a log Serilog wrote.]

Marc and Nick built Dapper at Stack Overflow and gave it away. It's still the shortest path I know from a SQL query to a C# object.

Brad co-created xUnit.net. [Most of the tests I've written in .NET run on it.]

Jeremy has maintained FluentValidation for years. [Every request model in our ASP.NET Core APIs is validated with it.]

2025 was a reminder that none of this is guaranteed. AutoMapper, MediatR and FluentAssertions moved to commercial licenses, and a lot of teams found out how much they relied on one person's spare time.

Maintainers owe us nothing. We owe them at least a thank-you, and maybe a sponsorship.

Which open-source library would your .NET stack fall apart without?

#dotnet #opensource`,
    },
    {
      id: "fri",
      date: "2026-09-18",
      kind: "post",
      time: "08:30",
      pillar: "Personal",
      format: "Text",
      formula: "F16 Status-Strip",
      goal: "Likes",
      angle: "\"I review everyone's PRs and still Google these 5 things\"",
      note: "Swap in your own five if these aren't yours. The post only works if the list is true.",
      commentTarget: 10,
      whom: "Team leads and engineering managers",
      how: "Share a mentoring moment or review habit",
      text: `At work, I'm the one who reviews everyone's pull requests.

On my own machine, I still Google the same 5 things every month:

→ CMD vs ENTRYPOINT in a Dockerfile, and which one gets overridden

→ the cron syntax for a scheduled GitHub Actions workflow

→ LINQ GroupBy with a projection, every single time

→ switchMap vs mergeMap vs concatMap in RxJS

→ how to undo the last git commit without losing my changes

[A real moment: e.g. "Last week I looked up ___ in the middle of reviewing a junior's PR."]

I remember thinking seniors had all of this memorized. So now I say it out loud to the juniors on my team: looking things up is the job, even after [N] years.

What have you looked up more than 20 times?

#softwareengineering #dotnet`,
    },
    { id: "sat", date: "2026-09-19", kind: "off" },
    { id: "sun", date: "2026-09-20", kind: "off" },
  ],

  // Posts from before this week, kept for reference.
  previous: [
    {
      id: "fri-11",
      date: "2026-09-11",
      kind: "post",
      time: "08:00",
      pillar: "Personal",
      format: "Text + image",
      formula: "F17 Controlled A/B",
      image: "https://api.pixfaro.com/i/usr_5b55380581e3b0a16b1e/img_4b8cfd754ca1c5a49119.png",
      goal: "Comments",
      status: "scheduled",
      angle: "AI refactor of a legacy loop into many functions",
      text: `The cleanest-looking code I reviewed recently was also the hardest to follow.

A junior on my team used an AI assistant to refactor one legacy loop that processes our enrollment batch CSV. Every row in that file is a real person: who they are and what they're enrolling in.

The new version looked great. Lots of small helpers spread across several files, each with a tidy name. The tests passed.

Then I tried to follow one person's row from input to output. I kept jumping from function to function, file to file. In the old loop, the same path reads top to bottom on one screen.

Same CSV. Same tests. The only variable was how many places the logic lived.

With enrollment data, that matters. A bad row means someone gets enrolled wrong, or not at all. When a batch fails, whoever is on call needs to see why in minutes.

So I pushed back in the review.

I don't blame my junior. The AI split the code because tidy-looking code is what it learned to produce, and nobody asked whether each split was worth the jump it costs the reader.

Small functions still earn their place when logic is reused, or when the name tells you something the code can't.

What I do now with every AI refactor: take one sample row and walk it through the new code, start to finish. If the flow is easier to follow than before, it ships. If I get lost halfway, it goes back.

If you review code your team writes with AI, what rule do you use?

#SoftwareEngineering #AI`,
    },
  ],

  checklist: [
    { text: "At least 1 personal / vulnerable post (Fri)", done: true },
    { text: "At least 1 post with hard facts (Wed)", done: true },
    { text: "Soft offer or call to action (optional P.S.)", done: false },
    { text: "Comments split ~70% peers / 20% known voices / 10% hiring managers", done: false },
    { text: "No pillar above 60% of posts", done: true },
    { text: "No formula repeated this week", done: true },
    { text: "Mix of reactions: saves, comments, reposts, likes", done: true },
  ],
};
