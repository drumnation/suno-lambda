import fetch from 'node-fetch';

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const request = event.request;
    if (request.type === 'LaunchRequest') {
        return buildResponse('Welcome to Magic Music Machine. You can ask me to create a song.', false);
    } else if (request.type === 'IntentRequest' && request.intent.name === 'CreateSongIntent') {
        const prompt = request.intent.slots.Prompt.value;
        
        // Start the song generation process and waiting music response concurrently
        const [waitingMusicResponse, songGenerationResult] = await Promise.all([
            buildResponseWithAudio('Please wait while I create your song.', 'https://magicmusicmachine.s3.us-west-2.amazonaws.com/waitingmusic.mp3', false),
            processSongGeneration(prompt)
        ]);
        
        // Return the waiting music response
        return songGenerationResult;
    } else {
        return buildResponse('Sorry, I didn\'t understand that.', true);
    }
};

const processSongGeneration = async (prompt) => {
    try {
        console.log('Queueing song generation');
        const trackIds = await queueSongGeneration(prompt);
        console.log('Track IDs received:', trackIds);

        // Wait for the song generation to complete
        console.log('Waiting for song generation to complete...');
        const trackDetails = await getTrackDetails(trackIds);

        if (trackDetails.length > 0) {
            console.log('Song generation complete');
            let responseText = 'Here is your song:';
            trackDetails.forEach(track => {
                responseText += ` Playing ${track.title}. <audio src="${track.audio_url}"/>`;
            });

            // Send the final response with the generated song
            return buildResponse(responseText, true);
        } else {
            console.log('No tracks generated');
            return buildResponse('Sorry, no tracks were generated.', true);
        }
    } catch (error) {
        console.error('Error during song generation:', error);
        return buildResponse('Sorry, there was an error generating the song.', true);
    }
};

const queueSongGeneration = async (prompt) => {
    try {
        console.log('Making API call to queue song generation with prompt:', prompt);
        console.log('API request URL:', 'https://suno-unofficial-api-git-main-david-mielochs-projects.vercel.app/api/generate');
    console.log('API request method:', 'POST');
    console.log('API request headers:', {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    });
    console.log('API request body:', JSON.stringify({
      prompt: prompt,
      make_instrumental: false,
      model: "chirp-v3-5",
      wait_audio: false
    }));
        const response = await fetch(
            'https://suno-unofficial-api-git-main-david-mielochs-projects.vercel.app/api/generate',
            {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    make_instrumental: false,
                    model: "chirp-v3-5",
                    wait_audio: false
                })
            }
        );

        const data = await response.json();
        console.log('API response status:', response.status);
        console.log('API response data:', data);

        if (!response.ok) {
            console.error(`API call failed with status code ${response.status}`);
            throw new Error(`API call failed with status code ${response.status}`);
        }

        if (!Array.isArray(data) || data.length === 0) {
            console.error('No tracks were generated');
            throw new Error('No tracks were generated');
        }

        const trackIds = data.map(track => track.id);
        console.log('Generated track IDs:', trackIds);
        return trackIds;
    } catch (error) {
        console.error('Error generating song:', error);
        throw new Error('Failed to generate song');
    }
};

const getTrackDetails = async (trackIds) => {
    try {
        console.log('Fetching track details for track IDs:', trackIds);
        const response = await fetch(
            `https://suno-unofficial-api.vercel.app/api/get?ids=${trackIds.join(',')}`,
            {
                headers: {
                    'accept': 'application/json'
                }
            }
        );

        const data = await response.json();
        console.log('Track details response status:', response.status);
        console.log('Track details response data:', data);

        if (!response.ok) {
            console.error(`API call failed with status code ${response.status}`);
            throw new Error(`API call failed with status code ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Error fetching track details:', error);
        throw new Error('Failed to fetch track details');
    }
};

const buildResponse = (outputText, shouldEndSession) => {
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'SSML',
                ssml: `<speak>${outputText}</speak>`,
            },
            shouldEndSession: shouldEndSession,
        }
    };
};

const buildResponseWithAudio = (text, audioUrl, shouldEndSession) => {
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'SSML',
                ssml: `<speak>${text} <audio src="${audioUrl}"/></speak>`,
            },
            shouldEndSession: shouldEndSession,
        }
    };
};
