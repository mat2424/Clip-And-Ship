export const YouTubeVideoSection = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-cool-charcoal">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-8">
          See Clip & Ship AI in Action
        </h2>
        <div className="relative w-full max-w-3xl mx-auto">
          <div className="aspect-video rounded-lg overflow-hidden shadow-2xl border border-cool-turquoise/30">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Clip & Ship AI Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};