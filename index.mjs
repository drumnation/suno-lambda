import { SkillBuilders } from 'ask-sdk-core';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to Magic Music Machine. You can ask me to create a song.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Welcome', speechText)
            .getResponse();
    }
};

const CreateSongIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CreateSongIntent';
    },
    async handle(handlerInput) {
        const prompt = handlerInput.requestEnvelope.request.intent.slots.Prompt.value;

        // Start the song generation process
        const waitingMusicResponse = handlerInput.responseBuilder
            .speak('Please wait while I create your song.')
            .addAudioPlayerPlayDirective('REPLACE_ALL', 'https://magicmusicmachine.s3.us-west-2.amazonaws.com/waitingmusic.mp3', 'waitingMusicToken', 0)
            .getResponse();

        // Send the waiting music response
        handlerInput.responseBuilder.withShouldEndSession(false);
        await handlerInput.attributesManager.setSessionAttributes({ waitingForSong: true });
        return waitingMusicResponse;
    }
};

const AudioPlayerEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getSessionAttributes();
        if (attributes.waitingForSong) {
            const prompt = attributes.lastPrompt;
            const songGenerationResult = await processSongGeneration(prompt);
            return songGenerationResult;
        }
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error('Error handled:', error);
        const speechText = 'Sorry, there was an error. Please try again.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const processSongGeneration = async (prompt) => {
    try {
        console.log('Queueing song generation');
        const trackIds = await queueSongGeneration(prompt);
        console.log('Track IDs received:', trackIds);

        console.log('Waiting for song generation to complete...');
        const trackDetails = await getTrackDetails(trackIds);

        if (trackDetails.length > 0) {
            console.log('Song generation complete');
            let responseText = 'Here is your song:';
            const audioItems = trackDetails.map(track => ({
                stream: {
                    url: track.audio_url,
                    token: track.id,
                    expectedPreviousToken: null,
                    offsetInMilliseconds: 0
                },
                metadata: {
                    title: track.title,
                    subtitle: 'Generated Song',
                    art: {
                        sources: [
                            {
                                url: 'https://example.com/album-art.jpg' // Replace with actual album art URL
                            }
                        ]
                    },
                    backgroundImage: {
                        sources: [
                            {
                                url: 'https://example.com/background.jpg' // Replace with actual background image URL
                            }
                        ]
                    }
                }
            }));

            return handlerInput.responseBuilder
                .speak(responseText)
                .addAudioPlayerPlayDirective('REPLACE_ALL', audioItems[0].stream.url, audioItems[0].stream.token, 0, null, audioItems[0].metadata)
                .getResponse();
        } else {
            console.log('No tracks generated');
            return handlerInput.responseBuilder
                .speak('Sorry, no tracks were generated.')
                .getResponse();
        }
    } catch (error) {
        console.error('Error during song generation:', error);
        return handlerInput.responseBuilder
            .speak('Sorry, there was an error generating the song.')
            .getResponse();
    }
};

// queueSongGeneration and getTrackDetails functions remain the same

export const handler = SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CreateSongIntentHandler,
        AudioPlayerEventHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();