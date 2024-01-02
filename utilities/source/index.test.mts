// test(
//   "backgroundJob()",
//   {
//     ...(!process.stdin.isTTY
//       ? {
//           skip: "Run interactive test with ‘node ./build/index.test.mjs’.",
//         }
//       : {}),
//   },
//   async () => {
//     const backgroundJob = node.backgroundJob({ interval: 3 * 1000 }, () => {
//       console.log("backgroundJob(): Running background job...");
//     });
//     process.on("SIGTSTP", () => {
//       backgroundJob.run();
//     });
//     console.log(
//       "backgroundJob(): Press ⌃Z to force background job to run and ⌃C to continue...",
//     );
//     await node.shouldTerminate();
//     backgroundJob.stop();
//   },
// );
