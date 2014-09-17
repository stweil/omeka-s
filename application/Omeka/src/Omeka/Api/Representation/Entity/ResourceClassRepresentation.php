<?php
namespace Omeka\Api\Representation\Entity;

class ResourceClassRepresentation extends AbstractEntityRepresentation
{
    public function getJsonLd()
    {
        $entity = $this->getData();
        return array(
            '@id'              => $this->getAdapter()->getApiUrl($entity),
            'o:id'         => $entity->getId(),
            'o:local_name' => $entity->getLocalName(),
            'o:label'      => $entity->getLabel(),
            'o:comment'    => $entity->getComment(),
            'o:vocabulary' => $this->getReference(
                null,
                $entity->getVocabulary(),
                $this->getAdapter('vocabularies')
            ),
            'o:owner' => $this->getReference(
                null,
                $entity->getOwner(),
                $this->getAdapter('users')
            ),
        );
    }

    public function getLabel()
    {
        return $this->getData()->getLabel();
    }
}
