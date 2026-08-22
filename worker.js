export default {
  async fetch(request) {
    return new Response(
      JSON.stringify({
        status: "online",
        name: "HungAI",
        message: "Worker đang hoạt động."
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        }
      }
    );
  }
};
