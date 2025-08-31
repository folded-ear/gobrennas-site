import { cloudRunProbesFilter } from "@/filters/cloud-run-probes";
import { buildFilterChain } from "@/filters/filters";

/*
To add additional middleware, define a Filter:

  function myNiftyFilter(request: NextRequest, chain: FilterChain): NextResponse {
    if ( ... ) {
      // Immediately return a response, terminating both the filter chain and
      // NextJS's overall request handling pipeline.
      return new NextResponse( ... );
    }

    // Perform request pre-processing.

    // Exchange the request for a response.
    const response = chain(request);

    // Perform response post-processing.

    // Return the response.
    return response;
  }

Then register the Filter in the chain below, at the position it should run.
 */
export default buildFilterChain(cloudRunProbesFilter);
