// Everything planned, on any date. The planner always shows today and the next
// 6 days: a date with nothing here gets an empty day, and posts from before today
// move to Earlier posts. Keep every id unique across this file (your browser edits
// are saved by id). `week:` on the older posts is the week they were first saved
// under, which keeps their images and Publora records attached; leave it as is.
window.PLAN = {
  timezone: "IST",

  days: [
    {
      id: "mon",
      week: "2026-09-14",
      date: "2026-09-14",
      kind: "comment",
      title: "Commenting day",
      commentTarget: 10,
      whom: ".NET educators (e.g. Milan Jovanović, Nick Chapsas, Steve \"Ardalis\" Smith) and peer engineers with 1k–10k followers",
      how: "Answer their question with a real example from your work",
    },
    {
      id: "thu",
      week: "2026-09-14",
      date: "2026-09-17",
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
      week: "2026-09-14",
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

May 2023. Angular 16 introduces Signals, making change detection simpler.

Nov 2023. Angular 17 adds the new @if and @for control flow, deferrable views, and a new home at angular.dev.

Nov 2024. Angular 19 makes standalone the default.

A new major version every 6 months, for 8 years straight.

What died was the 2016 version of Angular — NgModules everywhere, a steep learning curve, and an experience that scared plenty of juniors away.

What ships today looks a lot more like the rest of modern TypeScript.

I've watched most of this timeline from inside one codebase.

The video analytics platform I work on went from Angular 12 to 18 one upgrade at a time, along with the charting library I built for it and the shared component libraries we publish to npm.

And that made me think about the latest version of the same prediction:

“Developers are dead because of AI.”

I don't think we need to fear it.

The real risk is using AI just to get answers.

Used well, it can help us learn faster.

A few habits that help:

→ When AI fixes a bug, ask it why the fix works.

→ Read every line it writes before you ship it.

→ Try the next change yourself first, then ask AI to review it.

It's the same idea as upgrading a framework one version at a time.

Each small step teaches you something the next one builds on.

If AI takes you straight to the answer every time, you skip those steps — and the gaps show up later.

What's the most confident “X is dead” prediction you've seen in tech?

#Angular #AI`,
    },
    {
      id: "fri",
      week: "2026-09-14",
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
    { id: "tue", week: "2026-09-14", date: "2026-09-15", kind: "off" },
    {
      id: "sun-20",
      week: "2026-09-20",
      date: "2026-09-19",
      kind: "post",
      time: "09:30",
      pillar: "Teaching",
      format: "Text + GIF",
      formula: "Story walk-through (one alert, start to finish)",
      image: "local:rabbitmq-flow.gif",
      goal: "Saves",
      angle: "What happens to a failed RabbitMQ message, and why the dead-letter queue is where you look back",
      note: "Weekend posts reach 30-50% fewer people than weekday ones. Before sending, check three things: each consumer has its own channel, the connection lock guards opening the connection, and fire/smoke alerts travel through RabbitMQ.",
      todo: {
        reply: [
          {
            note: "A commenter asked “What about deadlock?” on your async/await post (Thu 17). A shorter 291-character version is in your local drafts file.",
            text: `Deadlock is the restaurant with a house rule: the waiter who took the order has to be the one who serves it. That's the SynchronizationContext on a WPF/WinForms UI thread, or in old ASP.NET.

That waiter calls .Result and stands at the kitchen door. The food is ready, but only that waiter may carry it out, and that waiter is busy waiting for the food. Nobody moves.

ASP.NET Core has no such rule, so there you get starvation instead of a deadlock. The fix is the same: await all the way, and ConfigureAwait(false) in library code so any waiter can carry the plate.`,
            done: false,
          },
        ],
      },
      commentTarget: 10,
      whom: "People posting about RabbitMQ, messaging, and event-driven .NET",
      how: "Share a failure mode you've hit and what you did about it",
      text: `3 things can happen to a failed RabbitMQ message: it vanishes, it keeps coming back, or it waits in a dead-letter queue.

Only the last one lets you look back and find out why it failed.

We build a video analytics platform. Cameras pick up faces, number plates, traffic and smoke, and those events travel through RabbitMQ, a message queue, before they reach a screen.

So picture one smoke alert at 2:14 AM, and follow it.

It lands in a queue with several workers pulling from it. If one worker is slow, the others keep going.

Worker B picks it up. RabbitMQ doesn't delete the alert yet. It waits for B to say "done".

B crashes halfway through. "Done" never arrives, so RabbitMQ puts the alert back and worker C takes it. Nobody has to notice.

C finishes and says "done" on the same channel the alert came in on. A channel is a lane inside the connection, and RabbitMQ only accepts the "done" on the lane that delivered the alert.

Now picture a broken message that fails every time. Put it back in the queue and it comes straight back, over and over.

So what do you do with a message that will never succeed?

You stop retrying it. Ours goes to a dead-letter queue (DLQ), where we can open it the next morning and see why it failed.

That only works because every message carries its metadata in the headers. A dead message that can't say where it came from is just noise.

Under all of it, the app opens one connection to RabbitMQ behind a lock, so two threads starting at once can't open two.

We added these one at a time: acknowledgements, dead-letter queues, metadata, more consumers, the connection lock.

A queue that works in a demo and a queue you'd trust with a fire alert are two different things.

What did you add to your message queue only after it bit you?

P.S. The GIF follows three messages through this whole trip. Watch m2, the one that would have been lost.

#RabbitMQ #dotnet`,
    },
    {
      id: "tue-22",
      date: "2026-09-21",
      kind: "post",
      time: "09:30",
      pillar: "Build log",
      format: "Text + GIF",
      formula: "F20 Diverging-Curves close",
      image: "local:modules-tests.gif",
      goal: "Reposts",
      angle: "7 modules, and the test project that keeps them apart",
      note: "Check the events module dates (Nov 2025 to Apr 2026) and that the architecture tests run with the rest of the suite.",
      commentTarget: 10,
      whom: "Clean architecture and modular monolith voices in .NET",
      how: "Add the layer rule you enforce and how",
      text: `7 modules, 7 sets of EF Core migrations, and one test project that fails the moment a layer reaches where it shouldn't.

That's our .NET 8 video analytics backend today. From November 2025 to April 2026 I pulled the events engine out of the main project into its own module. FRS, Actions, Dashboard and Report followed this year. With Logs and Schedule, that makes 7.

A lot of what I was pulling apart, I had written myself in 2023 and 2024.

Each module now owns its own:

→ EF Core migrations (the scheduler even has its own schema)
→ presentation registration, so the host just asks each module to register itself
→ MediatR handlers
→ cached entities, deep-copied on the way out so one module can't change what another is reading

7 modules also means 7 places to take a shortcut. The architecture tests are what stop that. They check layer dependencies and naming conventions every time the suite runs, so a domain layer that references infrastructure fails the test run before anyone reviews it.

Rules that live in code review get looser as deadlines get closer. Rules that live in a test are as strict on release day as they were on day one.

What's the first layering rule you'd put in a test?

P.S. Wednesday: the one piece of this system I've rewritten twice.

#dotnet #softwarearchitecture`,
    },
    {
      id: "wed-23",
      date: "2026-09-23",
      kind: "post",
      time: "08:30",
      pillar: "Personal",
      format: "Text + GIF",
      formula: "F3 Year-over-Year Pivot",
      image: "local:export-rewrites.gif",
      goal: "Comments",
      angle: "The export engine I rewrote twice in 19 months",
      note: "Check that you wrote the original export (2023) before both rewrites.",
      commentTarget: 10,
      whom: "People posting about refactoring, rewrites, and legacy code",
      how: "Share what your own rewrite taught you",
      text: `In December 2024 I rewrote our export engine.

In July 2026 I rewrote it again.

19 months apart, and I'd written the version before both of them too.

The exports are what people take out of our video analytics system, often Excel files with face and number-plate images embedded.

Rewrite 1 was about flexibility:

→ export strategies: straight from the database, or built in memory
→ requests driven by config, with export properties loaded from the DB instead of hardcoded
→ a CSV writer and one combined ZIP
→ cancellation tokens, so a big export can be stopped halfway

Then the reports kept coming. Person In-Time, ANPR Vehicle Flow, ANPR Vehicle In-Time, Frequent Visitors and Days-Exceeded Visitors all shipped between the two rewrites. That's 5 new reports.

Rewrite 2 was about making every export behave the same way:

→ one export contract that every provider implements
→ a lifecycle status the UI reads to show where an export is
→ an image pipeline, cancellation, and EPPlus upgraded to 8.5.3

The awkward part of rewriting your own code twice: there's no previous developer to blame. I was the previous developer.

What's the piece of your own code you've rewritten the most times?

#dotnet #softwareengineering`,
    },
    {
      id: "fri-25",
      date: "2026-09-25",
      kind: "post",
      time: "08:30",
      pillar: "Teaching",
      format: "Text + GIF",
      formula: "F15 Explain-to-Kids (spreadsheet analogy)",
      image: "local:angular-signals.gif",
      goal: "Saves",
      angle: "Angular Signals explained as a spreadsheet, with pros and cons",
      note: "Not about your work: a pure teaching post. Friday after 2 PM reaches fewer people, so keep it in the morning.",
      commentTarget: 10,
      whom: "Angular voices and frontend peers posting about signals, RxJS, or zoneless",
      how: "Add a signals gotcha or a migration tip they didn't mention",
      text: `3 functions are all you need to understand Angular Signals: signal(), computed() and effect().

The easiest way to learn them is a spreadsheet.

A signal is a cell. Cell A1 holds 5.
const price = signal(5);

computed() is a formula cell. B1 = A1 × 2, and it updates by itself when A1 changes.
const total = computed(() => price() * 2);

effect() is something that should happen whenever a cell changes, like logging it or saving it.
effect(() => console.log(total()));

Change the cell with price.set(10), and total recalculates and the effect runs. Anything that doesn't read price is left alone.

What you gain:

→ Fine-grained updates. Angular knows exactly which templates read a signal, so it can skip the ones that don't.
→ Nothing to subscribe to or unsubscribe from, so there's no forgotten subscription leaking memory.
→ computed() is lazy and cached. It recalculates only when an input changes and something actually reads it.
→ Signals are the foundation for zoneless Angular, where zone.js no longer has to trigger change detection.

What to watch for:

→ You read a signal by calling it: isLoggedIn(), not isLoggedIn. Without the brackets you're checking the function itself, and a function is always truthy.
→ Pushing into an array inside a signal doesn't notify anyone, because it's still the same array. Give it a new one: items.update(list => [...list, item]).
→ Signals hold a value, not a stream. For debouncing or cancelling events over time, RxJS is still the better tool.
→ effect() is easy to overuse. If an effect sets one signal from another, a computed() is usually what you wanted.

The short version: signals for state, RxJS for events.

Are you moving your Angular app to signals, or keeping RxJS for most of it?

#Angular #WebDevelopment`,
    },
  ],

  // Posts from before this week, kept for reference.
  previous: [
    {
      id: "fri-11",
      week: "2026-09-14",
      date: "2026-09-11",
      kind: "post",
      time: "08:00",
      pillar: "Personal",
      format: "Text + image",
      formula: "F17 Controlled A/B",
      image: "https://api.pixfaro.com/i/usr_5b55380581e3b0a16b1e/img_4b8cfd754ca1c5a49119.png",
      goal: "Comments",
      status: "scheduled",
      publoraId: "6aa2e9925adfc83da2ad94c9",
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
