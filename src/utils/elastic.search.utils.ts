import { RawElasticEventType } from 'src/services/elastic-search/entities/raw.elastic.event';

export const convertEventTopicsAndDataToBase64 = (
    originalEvent: RawElasticEventType,
): RawElasticEventType => {
    if (originalEvent.topics && Array.isArray(originalEvent.topics)) {
        const convertedTopics: string[] = [];
        for (const topic of originalEvent.topics) {
            const base64Topic = Buffer.from(topic, 'hex').toString('base64');
            convertedTopics.push(base64Topic);
        }
        originalEvent.topics = convertedTopics;
    }

    if (originalEvent.data && originalEvent.data.length > 0) {
        originalEvent.data = Buffer.from(originalEvent.data, 'hex').toString(
            'base64',
        );
    }

    return originalEvent;
};
